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

const req = (body: Record<string, unknown>, token?: string, ip = "10.0.0.1") =>
  ({ body, headers: {}, cookies: token ? { token } : {}, ip }) as any;

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

test("five wrong passwords lock that employee from that IP only", async () => {
  for (let i = 0; i < 5; i++) {
    await expect(assertClockAuth(req({ password: "nope" }, undefined, "6.6.6.6"), "u4")).rejects.toMatchObject({ status: 401 });
  }
  // The guesser's IP is locked, even with the right password...
  await expect(assertClockAuth(req({ password: "right-pass" }, undefined, "6.6.6.6"), "u4")).rejects.toMatchObject({ status: 429 });
  // ...but the real employee on their own phone is not.
  await expect(assertClockAuth(req({ password: "right-pass" }, undefined, "1.2.3.4"), "u4")).resolves.toBeUndefined();
});

test("a login token for the same user needs no password; another user's token does", async () => {
  const mine = jwt.sign({ accountId: "u5" }, "test-secret");
  await expect(assertClockAuth(req({}, mine), "u5")).resolves.toBeUndefined();
  const other = jwt.sign({ accountId: "someone-else" }, "test-secret");
  await expect(assertClockAuth(req({}, other), "u5")).rejects.toMatchObject({ status: 401 });
});
