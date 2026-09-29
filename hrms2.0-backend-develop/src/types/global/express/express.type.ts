import type { Request } from "express";
import User from "src/models/workforce/user.model";

export interface CustomRequest extends Request {
  account?: typeof User.prototype;
}
