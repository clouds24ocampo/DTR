import { appConfig } from "src/config/app.config";
import type { Response } from "express";
import jwt from "jsonwebtoken";

const generateToken = (accountId: string, res: Response) => {
  const token = jwt.sign({ accountId }, process.env.JWT_SECRET as string, {
    expiresIn: `${appConfig.auth.sessionDays}d`,
  });

  res.cookie("token", token, {
    maxAge: appConfig.auth.sessionCookieMaxAgeMs,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return token;
};

export default generateToken;
