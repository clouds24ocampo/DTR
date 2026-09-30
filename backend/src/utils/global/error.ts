import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Error with an HTTP status; safe to show its message to the client. */
export class ServiceError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
  }
}

/** Wraps an async handler so rejections reach the global error handler (no per-controller try/catch). */
export const asyncHandler =
  <Req extends Request = Request>(
    fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
  ): RequestHandler =>
  (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };

/** Express error middleware: ServiceError/4xx messages pass through, everything else is logged and hidden. */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 500;
  const code = (err as { code?: unknown })?.code;
  const name = (err as Error)?.name;

  if (code === 11000) {
    res.status(409).json({ message: "A record with the same unique value already exists." });
    return;
  }
  if (name === "ValidationError" || name === "CastError") {
    res.status(400).json({ message: "Validation error" });
    return;
  }
  if (status >= 500) {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
  res.status(status).json({ message: (err as Error).message });
};
