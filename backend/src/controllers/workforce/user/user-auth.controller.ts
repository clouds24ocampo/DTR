import { appConfig } from "src/config/app.config";
// user-auth.controller.ts
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import UserModel from "../../../models/workforce/user.model";
import { resolveEmployeeIdNumber } from "../../../utils/global/id-number.utils";

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
      position,
      salaryType,
    ];
    // Note: middleName, workInfo, location, and salary are optional fields.
    // idNumber is optional: blank/omitted → auto-generated (QC-YYYY-NNNN).
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

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: "Email already exists." });
      return;
    }

    let finalIdNumber: string;
    try {
      finalIdNumber = await resolveEmployeeIdNumber(idNumber);
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status: unknown }).status) || 400
          : 400;
      res.status(status).json({
        message: err instanceof Error ? err.message : "Invalid ID number.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, appConfig.auth.bcryptRounds);

    await UserModel.create({
      username,
      email,
      password: hashedPassword,
      firstName,
      middleName: middleName || "",
      lastName,
      idNumber: finalIdNumber,
      position,
      workInfo: workInfo || "",
      location: location || "",
      salary: salary || 0,
      salaryType,
    });

    res
      .status(201)
      .json({ message: "Employee registered successfully", idNumber: finalIdNumber });
  } catch (error: any) {
    console.error("Error in registerEmployee:", error);
    if (res.headersSent) return;
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
