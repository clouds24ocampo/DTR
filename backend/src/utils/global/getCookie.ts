import { CustomRequest } from "src/types/global/express/express.type";
import { ServiceError } from "./error";

export const getUserFromCookie = (req: CustomRequest) => {
  const user = req.account;
  if (!user) {
    throw new ServiceError("User not logged in", 401);
  }

  return user;
};
