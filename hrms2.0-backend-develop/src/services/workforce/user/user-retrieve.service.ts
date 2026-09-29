import { ServiceError } from "src/utils/global/error";
import UserModel from "../../../models/workforce/user.model";
import { IUser } from "../../../types/workforce/user/user.type";

export const getAllEmployeesService = async (): Promise<IUser[]> => {
  try {
    const employees = await UserModel.find();
    return employees;
  } catch (err) {
    throw new ServiceError("Failed to retrieve employees.", 500);
  }
};

export const getActiveEmployeesService = async (): Promise<IUser[]> => {
  try {
    const employees = await UserModel.find({ archived: { $ne: true } });
    return employees;
  } catch (err) {
    throw new ServiceError("Failed to retrieve active employees.", 500);
  }
};

export const getArchivedEmployeesService = async (): Promise<IUser[]> => {
  try {
    const employees = await UserModel.find({ archived: true });
    return employees;
  } catch (err) {
    throw new ServiceError("Failed to retrieve archived employees.", 500);
  }
};

export const getUserProfileService = async (
  userId: string
): Promise<IUser | null> => {
  try {
    const userProfile = await UserModel.findById(userId).select(
      "username profilePicture"
    );
    if (!userProfile) {
      throw new ServiceError("User not found.", 404);
    }
    return userProfile;
  } catch (err) {
    throw new ServiceError("Failed to retrieve user profile.", 500);
  }
};

export const getOwnDataService = async (
  userId: string
): Promise<IUser | null> => {
  try {
    const userData = await UserModel.findById(userId).select("-password");
    if (!userData) {
      throw new ServiceError("User not found.", 404);
    }
    return userData;
  } catch (err) {
    throw new ServiceError("Failed to retrieve user data.", 500);
  }
};
