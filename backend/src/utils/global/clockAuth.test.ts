import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const findById = jest.fn();
jest.mock("../../models/workforce/user.model", () => ({
  __esModule: true,
  default: { findById: (...args: unknown[]) => findById(...args) },
}));

import { assertClockAuth } from "./clockAuth";

process.env.JWT_SECRET = "test-secret";
const HASH = bcrypt.hashSync("right-pass", 4);

const req = (body: Record<string, unknown>, token?: string) =>
  ({ body, headers: {}, cookies: token ? { token } : {} }) as any;

beforeEach(() => {
  findById.mockReset();
  findById.mockReturnValue({ select: () => ({ lean: async () => ({ password: HASH }) }) });
});

test("correct password passes and is stripped from the body", async () => {
  const r = req({ password: "right-pass", userId: "u1" });
  await expect(assertClockAuth(r, "u1")).resolves.toBeUndefined();
  expect(r.body.password).toBeUndefined();
});

test("missing or wrong password is rejected", async () => {
  await expect(assertClockAuth(req({}), "u2")).rejects.toMatchObject({ status: 401 });
  await expect(assertClockAuth(req({ password: "nope" }), "u2")).rejects.toMatchObject({ status: 401 });
});

test("non-string password (operator object) is rejected", async () => {
  await expect(assertClockAuth(req({ password: { $ne: null } }), "u3")).rejects.toMatchObject({ status: 401 });
});

test("five wrong passwords lock the account, even for the right one", async () => {
  for (let i = 0; i < 5; i++) {
    await expect(assertClockAuth(req({ password: "nope" }), "u4")).rejects.toMatchObject({ status: 401 });
  }
  await expect(assertClockAuth(req({ password: "right-pass" }), "u4")).rejects.toMatchObject({ status: 429 });
});

test("a login token for the same user needs no password; another user's token does", async () => {
  const mine = jwt.sign({ accountId: "u5" }, "test-secret");
  await expect(assertClockAuth(req({}, mine), "u5")).resolves.toBeUndefined();
  const other = jwt.sign({ accountId: "someone-else" }, "test-secret");
  await expect(assertClockAuth(req({}, other), "u5")).rejects.toMatchObject({ status: 401 });
});
