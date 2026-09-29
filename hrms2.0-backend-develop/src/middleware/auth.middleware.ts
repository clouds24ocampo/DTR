import dotenv from "dotenv";
import { NextFunction, Response } from "express";
import { CustomRequest } from "src/types/global/express/express.type";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in environment variables.");
}

export const authMiddleware = (positions: string[] = []) => {
  return (req: CustomRequest, res: Response, next: NextFunction): void => {
    try {
      if (positions.length > 0) {
        // Ensure user position is treated as array (backwards compatibility or strict array)
        const userPositions = Array.isArray(req.account.position)
          ? req.account.position
          : [req.account.position];

        const hasPermission = userPositions.some((uPos: string) =>
          positions.some((p) => p.toLowerCase() === uPos.toLowerCase())
        );

        if (!hasPermission) {
          res
            .status(403)
            .json({ message: "Forbidden: Insufficient permissions" });
          return;
        }
      }

      next();
    } catch (error) {
      res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }
  };
};

