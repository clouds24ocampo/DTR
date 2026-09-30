import { appConfig } from "src/config/app.config";
// user-auth.controller.ts
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import generateToken from "src/utils/global/generateToken";
import UserModel from "../../models/workforce/user.model";
import { generateEmployeeIdNumber } from "src/utils/global/id-number.utils";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    // Same response for unknown email / wrong password (no account enumeration)
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !isMatch) {
      res.status(401).json({ message: "Invalid email or password." });
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
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const registerSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, username } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ message: "First name, last name, email, and password are required." });
      return;
    }
    // Bootstrap only: once any Super Admin exists this endpoint is closed,
    // otherwise anyone could take over / create admin accounts.
    const adminExists = await UserModel.exists({ position: { $all: ["HR", "Operation Manager", "Workforce"] } });
    if (adminExists) {
      res.status(403).json({ message: "A Super Admin already exists." });
      return;
    }
    if (typeof password !== "string" || password.length < appConfig.auth.passwordMinLength) {
      res.status(400).json({ message: `Password must be at least ${appConfig.auth.passwordMinLength} characters long.` });
      return;
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedUsername = String(username || normalizedEmail.split("@")[0]).toLowerCase().trim();

    if (await UserModel.exists({ $or: [{ email: normalizedEmail }, { username: normalizedUsername }] })) {
      res.status(409).json({ message: "Email or username already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, appConfig.auth.bcryptRounds);

    const newAdmin = await UserModel.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      idNumber: await generateEmployeeIdNumber(),
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
    res.status(500).json({ message: "Failed to register Super Admin" });
  }
};
