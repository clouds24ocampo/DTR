import { appConfig } from "src/config/app.config";
import { Request, Response } from "express";
import UserModel from "../../models/workforce/user.model";
import PasswordResetPin from "../../models/auth/password-reset-pin.model";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { sendPasswordResetPinEmail } from "../../utils/global/mail/passwordResetPinEmail";

/**
 * Generate a random 6-digit PIN
 */
const generatePin = (): string => {
  return randomInt(100000, 1000000).toString();
};

/**
 * Request password reset PIN
 * POST /api/auth/forgot-password/request-pin
 */
export const requestPasswordResetPin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal if email exists for security
      res.status(200).json({
        message: "If the email exists, a PIN has been sent.",
      });
      return;
    }

    // Generate 6-digit PIN
    const pin = generatePin();

    // Set expiration to 15 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + appConfig.auth.pinTtlMinutes);

    // Invalidate any existing PINs for this email
    await PasswordResetPin.deleteMany({ email: email.toLowerCase().trim() });

    // Create new PIN record
    await PasswordResetPin.create({
      email: email.toLowerCase().trim(),
      pin,
      expiresAt,
      verified: false,
    });

    // Send PIN via email
    try {
      await sendPasswordResetPinEmail(
        user.email || email,
        user.firstName,
        user.lastName,
        pin
      );
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      // Still return success to user, but log the error
    }

    res.status(200).json({
      message: "If the email exists, a PIN has been sent.",
    });
  } catch (error) {
    console.error("Error requesting password reset PIN:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * Verify password reset PIN
 * POST /api/auth/forgot-password/verify-pin
 */
export const verifyPasswordResetPin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, pin } = req.body;

    if (typeof email !== "string" || typeof pin !== "string") {
      res.status(400).json({ message: "Email and PIN are required." });
      return;
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      res.status(400).json({ message: "PIN must be a 6-digit number." });
      return;
    }

    // Find valid PIN record
    const pinRecord = await PasswordResetPin.findOne({
      email: email.toLowerCase().trim(),
      pin,
      verified: false,
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!pinRecord) {
      res.status(400).json({
        message: "Invalid or expired PIN. Please request a new one.",
      });
      return;
    }

    // Verify the PIN
    pinRecord.verified = true;
    await pinRecord.save();

    res.status(200).json({
      message: "PIN verified successfully.",
    });
  } catch (error) {
    console.error("Error verifying password reset PIN:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * Reset password with verified PIN
 * POST /api/auth/forgot-password/reset
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, pin, newPassword } = req.body;

    if (typeof email !== "string" || typeof pin !== "string" || typeof newPassword !== "string") {
      res.status(400).json({
        message: "Email, PIN, and new password are required.",
      });
      return;
    }

    if (newPassword.length < appConfig.auth.passwordMinLength) {
      res.status(400).json({
        message: `Password must be at least ${appConfig.auth.passwordMinLength} characters long.`,
      });
      return;
    }

    // Find verified PIN record
    const pinRecord = await PasswordResetPin.findOne({
      email: email.toLowerCase().trim(),
      pin,
      verified: true,
      expiresAt: { $gt: new Date() }, // Still not expired
    });

    if (!pinRecord) {
      res.status(400).json({
        message: "Invalid or expired PIN. Please request a new one.",
      });
      return;
    }

    // Find user
    const user = await UserModel.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, appConfig.auth.bcryptRounds);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Delete the PIN record after successful reset
    await PasswordResetPin.deleteOne({ _id: pinRecord._id });

    res.status(200).json({
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

