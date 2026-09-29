// user-auth.controller.ts
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import generateToken from "src/utils/global/generateToken";
import UserModel from "../../models/workforce/user.model";
import { profile } from "console";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await UserModel.findOne({ email });
    console.log(user);
    if (!user) {
      res.status(404).json({ message: "Account not found." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Incorrect password." });
      return;
    }

    if (user.archived) {
      res.status(403).json({
        message:
          "Your account is currently inactive. Please contact the HR department for assistance.",
      });
      return;
    }

    const token = generateToken(user._id.toString(), res);
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        position: user.position,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        department: user.department,
        archived: user.archived,
        phone: user.phone,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        location: user.location,
        emergencyContact: user.emergencyContact,
        dateHired: user.dateHired,
        salary: user.salary,
        salaryType: user.salaryType,
        bankDetails: user.bankDetails,
        taxInformation: user.taxInformation,
        idNumber: user.idNumber,
        about: user.about,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const logout = (req: Request, res: Response) => {
  res.cookie("token", "", { maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
};

export const registerSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, username } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ message: "First name, last name, email, and password are required." });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = (username || email.split("@")[0]).toLowerCase().trim();

    const existingUser = await UserModel.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      existingUser.password = hashedPassword;
      existingUser.position = ["HR", "Operation Manager", "Workforce"] as any;
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.archived = false;
      await existingUser.save();

      const token = generateToken(existingUser._id.toString(), res);
      res.status(200).json({
        message: "Super Admin updated successfully",
        token,
        user: {
          _id: existingUser._id,
          email: existingUser.email,
          position: existingUser.position,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          archived: existingUser.archived,
        },
      });
      return;
    }

    const newAdmin = await UserModel.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      idNumber: `QC-${Math.floor(1000 + Math.random() * 9000)}`,
      position: ["HR", "Operation Manager", "Workforce"],
      archived: false,
      salaryType: "monthly",
      salary: 0,
      workInfo: "Corporate Headquarters",
      location: "Main Office",
    });

    const token = generateToken(newAdmin._id.toString(), res);
    res.status(201).json({
      message: "Super Admin registered successfully",
      token,
      user: {
        _id: newAdmin._id,
        email: newAdmin.email,
        position: newAdmin.position,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        archived: newAdmin.archived,
      },
    });
  } catch (error: any) {
    console.error("Error in registerSuperAdmin:", error);
    res.status(500).json({ message: error.message || "Failed to register Super Admin" });
  }
};
