import type { Request } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../../models/workforce/user.model";
import { ServiceError } from "./error";
// Lockout is per (employee, client IP): a coworker guessing from their own phone
// can't lock the real employee out. Cross-IP guessing is slowed by botDetection's IP limit.
// ponytail: in-memory per-process; move to Redis/DB if the API runs on several instances.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;
const failedAttempts = new Map<string, { count: number; first: number }>();

/**
 * Clock actions are public (employees use their own phones), so prove the
 * request comes from the employee: either a login token for that same user,
 * or that user's account password. Repeated wrong passwords lock the
 * employee's clock from that IP for 15 minutes. Always removes `password` from the body.
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
  const key = `${userId}|${req.ip ?? "unknown"}`;
  const fails = failedAttempts.get(key);
  if (fails && now - fails.first > LOCKOUT_MS) failedAttempts.delete(key);
  else if (fails && fails.count >= MAX_FAILED_ATTEMPTS) {
    throw new ServiceError("Too many wrong passwords. Try again in 15 minutes.", 429);
  }

  if (typeof password !== "string" || !password) {
    throw new ServiceError("Enter your password to continue.", 401);
  }
  const user = await UserModel.findById(userId).select("password").lean<{ password?: string } | null>();
  const ok = Boolean(user?.password) && (await bcrypt.compare(password, user!.password as string));
  if (!ok) {
    const f = failedAttempts.get(key) ?? { count: 0, first: now };
    f.count++;
    failedAttempts.set(key, f);
    if (failedAttempts.size > 10000) {
      for (const [k, v] of failedAttempts) if (now - v.first > LOCKOUT_MS) failedAttempts.delete(k);
    }
    throw new ServiceError("Incorrect password.", 401);
  }
  failedAttempts.delete(key);
}
