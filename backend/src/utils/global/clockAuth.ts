import type { Request } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../../models/workforce/user.model";
import { ServiceError } from "./error";
// ponytail: in-memory per-process lockout; move to Redis/DB if the API runs on several instances.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;
const failedAttempts = new Map<string, { count: number; first: number }>();

/**
 * Clock actions are public (employees use their own phones), so prove the
 * request comes from the employee: either a login token for that same user,
 * or that user's account password. Repeated wrong passwords lock the
 * account's clock for 15 minutes. Always removes `password` from the body.
 */
export async function assertClockAuth(req: Request, userId: string): Promise<void> {
  const password = (req.body as { password?: unknown }).password;
  delete (req.body as { password?: unknown }).password;

  const header = req.headers.authorization;
  const token =
    (req as Request & { cookies?: Record<string, string> }).cookies?.token ||
    (header?.startsWith("Bearer ") ? header.split(" ")[1] : undefined);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { accountId?: string };
      if (decoded?.accountId === userId) return;
    } catch {
      // fall through to password
    }
  }

  const now = Date.now();
  const fails = failedAttempts.get(userId);
  if (fails && now - fails.first > LOCKOUT_MS) failedAttempts.delete(userId);
  else if (fails && fails.count >= MAX_FAILED_ATTEMPTS) {
    throw new ServiceError("Too many wrong passwords. Try again in 15 minutes.", 429);
  }

  if (typeof password !== "string" || !password) {
    throw new ServiceError("Enter your password to continue.", 401);
  }
  const user = await UserModel.findById(userId).select("password").lean<{ password?: string } | null>();
  const ok = Boolean(user?.password) && (await bcrypt.compare(password, user!.password as string));
  if (!ok) {
    const f = failedAttempts.get(userId) ?? { count: 0, first: now };
    f.count++;
    failedAttempts.set(userId, f);
    throw new ServiceError("Incorrect password.", 401);
  }
  failedAttempts.delete(userId);
}
