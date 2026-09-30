import type { NextFunction, Request, Response } from "express";

// ponytail: in-memory per-process; use redis/express-rate-limit if running multiple instances
export const rateLimit = (max: number, windowMs: number) => {
  const hits = new Map<string, { count: number; start: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip || "unknown";
    const h = hits.get(key);
    if (!h || now - h.start > windowMs) {
      hits.set(key, { count: 1, start: now });
      if (hits.size > 10000) for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
      return next();
    }
    if (++h.count > max) {
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
};
