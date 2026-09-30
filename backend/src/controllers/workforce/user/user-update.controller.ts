import { appConfig } from "src/config/app.config";
// user-update.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import UserModel from "../../../models/workforce/user.model";
import bcrypt from "bcryptjs";
import uploadImageAndFile from "src/utils/global/uploadImageAndFile";
import path from "path";

import { CustomRequest } from "src/types/global/express/express.type";

const UPDATABLE_EMPLOYEE_FIELDS = [
  "username", "position", "firstName", "middleName", "lastName", "idNumber",
  "workInfo", "location", "salary", "salaryType", "email", "phone", "about",
  "gender", "dateOfBirth", "profilePicture", "sss", "philhealth", "pagibig",
];

export const updateEmployee = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    // Explicit allowlist: never spread the request body into the update
    const updates = Object.fromEntries(
      Object.entries(req.body ?? {}).filter(([key]) => UPDATABLE_EMPLOYEE_FIELDS.includes(key))
    ) as Record<string, unknown>;

    const boolFields = ["sss", "philhealth", "pagibig"];
    for (const key of boolFields) {
      if (updates[key] !== undefined && typeof updates[key] !== "boolean") {
        res.status(400).json({
          message: `Invalid value for ${key}. Must be a boolean.`,
        });
        return;
      }
    }

    const employee = await UserModel.findByIdAndUpdate(
      employeeId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!employee) {
      res.status(404).json({ message: "Employee not found." });
      return;
    }

    res.status(200).json({
      message: "Employee updated successfully",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const updateEmployeeProfile = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      about,
      gender,
      dateOfBirth,
      oldPassword,
      newPassword,
    } = req.body;

    const employeeId = req.params.id;
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    // Security check: Only the user themselves or an HR can update the profile
    const isHR = Array.isArray(req.account?.position)
      ? req.account?.position.includes("HR")
      : req.account?.position === "HR";

    if (req.account?._id.toString() !== employeeId && !isHR) {
      res.status(403).json({ message: "Unauthorized to update this profile." });
      return;
    }

    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      res.status(404).json({ message: "Employee not found." });
      return;
    }

    // Prevent updating restricted fields if NOT HR
    if (!isHR) {
      if (
        req.body.idNumber ||
        req.body.position ||
        req.body.workInfo ||
        req.body.location ||
        req.body.salary ||
        req.body.salaryType
      ) {
        res
          .status(403)
          .json({ message: "Unauthorized to update restricted work fields." });
        return;
      }
    }

    if (firstName !== undefined) employee.firstName = firstName;
    if (middleName !== undefined) employee.middleName = middleName;
    if (lastName !== undefined) employee.lastName = lastName;
    if (email !== undefined) employee.email = email;
    if (phone !== undefined) employee.phone = phone;
    if (about !== undefined) employee.about = about;
    if (gender !== undefined) employee.gender = gender;
    if (gender !== undefined) employee.gender = gender;
    if (dateOfBirth !== undefined) employee.dateOfBirth = dateOfBirth;
    if (isHR && req.body.position !== undefined) employee.position = req.body.position;

    // Handle profile picture update - can be either a file upload or a URL string
    if (req.file) {
      // If a file is uploaded, process it
      const allowedExt = ["jpg", "jpeg", "png"];
      const ext = path
        .extname(req.file.originalname)
        .toLowerCase()
        .replace(".", "");
      if (!allowedExt.includes(ext)) {
        res.status(400).json({
          message: `Invalid file type. Allowed: ${allowedExt.join(", ")}`,
        });
        return;
      }

      const profileImage = await uploadImageAndFile(
        req.file,
        `${process.env.UPLOAD_DIR}/employees/${employeeId}`
      );
      if (!profileImage) {
        res.status(500).json({ message: "Failed to upload image." });
        return;
      }
      employee.profilePicture = profileImage;
    } else if (req.body.image && typeof req.body.image === "string") {
      // If image is provided as a URL string (from chunk uploader)
      employee.profilePicture = req.body.image;
    }

    if (oldPassword && newPassword) {
      const isMatch = await bcrypt.compare(oldPassword, employee.password);
      if (!isMatch) {
        res.status(400).json({ message: "Old password incorrect." });
        return;
      }
      employee.password = await bcrypt.hash(newPassword, appConfig.auth.bcryptRounds);
    }

    await employee.save();
    res
      .status(200)
      .json({ message: "Profile updated successfully.", employee });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const archiveEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      res.status(404).json({ message: "Employee not found." });
      return;
    }
    employee.archived = true;
    await employee.save();
    res
      .status(200)
      .json({ message: "Employee archived successfully", employee });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const unarchiveEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      res.status(404).json({ message: "Employee not found." });
      return;
    }
    if (!employee.archived) {
      res.status(400).json({ message: "Employee is already active." });
      return;
    }
    employee.archived = false;
    await employee.save();
    res
      .status(200)
      .json({ message: "Employee unarchived successfully", employee });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const switchRole = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.body;
    const userId = req.account?._id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const allowedRoles = user.position;

    if (!allowedRoles.includes(role)) {
      res.status(403).json({ message: "You do not have permission to switch to this role." });
      return;
    }

    // Move the selected role to the front of the array (Active Role)
    const newPositions = [role, ...allowedRoles.filter((p: string) => p !== role)];
    user.position = newPositions;

    await user.save();

    res.status(200).json({
      message: `Switched to role ${role} successfully`,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const deleteEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const employee = await UserModel.findByIdAndDelete(employeeId);
    if (!employee) {
      res.status(404).json({ message: "Employee not found." });
      return;
    }
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
