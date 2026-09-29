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
