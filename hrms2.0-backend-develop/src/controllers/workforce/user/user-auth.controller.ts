// user-auth.controller.ts
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import UserModel from "../../../models/workforce/user.model";

interface AuthenticatedRequest extends Request {
  user?: { id: string; position: string };
}

export const registerEmployee = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      username,
      email,
      password,
      lastName,
      firstName,
      middleName,
      idNumber,
      position,
      workInfo,
      location,
      salaryType,
      salary,
    } = req.body;

    const requiredFields = [
      username,
      email,
      password,
      lastName,
      firstName,
      idNumber,
      position,
      salaryType,
    ];
    // Note: middleName, workInfo, location, and salary are optional fields
    if (
      requiredFields.some(
        (field) =>
          !field ||
          (typeof field === "string" && field.trim() === "")
      )
    ) {
      res
        .status(400)
        .json({ message: "All required fields must be provided." });
      return;
    }

    const existingUser = await UserModel.findOne({
      $or: [{ email }, { idNumber }],
    });
    if (existingUser) {
      res.status(409).json({ message: "Email or ID number already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.create({
      username,
      email,
      password: hashedPassword,
      firstName,
      middleName: middleName || "",
      lastName,
      idNumber,
      position,
      workInfo: workInfo || "",
      location: location || "",
      salary: salary || 0,
      salaryType,
    });

    res.status(201).json({ message: "Employee registered successfully" });
  } catch (error: any) {
    console.error("Error in registerEmployee:", error);
    if (res.headersSent) return;
    res.status(500).json({
      message: "Internal server error",
      error: error?.message,
    });
  }
};
