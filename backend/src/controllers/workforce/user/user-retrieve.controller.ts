import { Request, Response } from "express";
import UserModel from "../../../models/workforce/user.model";
import { getUserFromCookie } from "../../../utils/global/getCookie";
import { ServiceError } from "../../../utils/global/error";
import bcrypt from "bcryptjs";

export const getAllEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //getUserFromCookie(req);
    const employees = await UserModel.find();

    for (const employee of employees) {
      const originalPassword = "password";

      const isPasswordCorrect = await bcrypt.compare(
        originalPassword,
        employee.password
      );

      employee.password = originalPassword;
    }

    employees.forEach((employee) => {
      delete employee.password;
    });

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getActiveEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    getUserFromCookie(req);
    const employees = await UserModel.find({ archived: { $ne: true } });
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getArchivedEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    getUserFromCookie(req);
    const employees = await UserModel.find({ archived: true });
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userProfile = await UserModel.findById(id).select(
      "username profilePicture"
    );
    if (!userProfile) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.status(200).json(userProfile);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getOwnData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getUserFromCookie(req);
    // Use _id (MongoDB ObjectId) or fallback to id if available
    const userId = (user as any)?._id?.toString() || (user as any)?.id;

    if (!userId) {
      res.status(400).json({ message: "Unable to resolve user ID." });
      return;
    }

    const userData = await UserModel.findById(userId).select("-password");
    if (!userData) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.status(200).json(userData);
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
