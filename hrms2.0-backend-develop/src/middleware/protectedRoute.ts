import type { NextFunction, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import User from "src/models/workforce/user.model";
import { CustomRequest } from "src/types/global/express/express.type";

const protectRoute = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      console.error("Unauthorized - No Token Provided");
      return res
        .status(401)
        .json({ error: "Unauthorized - No Token Provided" });
    }

    // Type assertion: assume decoded has a accountId property
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload & { accountId: string };

    if (!decoded || !decoded.accountId) {
      return res.status(401).json({ error: "Unauthorized - Invalid Token" });
    }

    const account = await User.findById(decoded.accountId).select("-password");

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (account.archived) {
      return res.status(403).json({
        error:
          "Your account is currently inactive. Please contact the HR department for assistance.",
      });
    }

    // Assign account to the request object
    req.account = account;

    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("Error in protectRoute middleware:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.status(500).json({ error: "Internal Server Error " });
    }
  }
};

export default protectRoute;
