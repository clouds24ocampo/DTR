import { appConfig } from "src/config/app.config";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../../models/workforce/user.model";

export const registerDevice = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Create a JWT token for the device
        const deviceToken = jwt.sign(
            { userId: user._id, type: "device_access" },
            process.env.JWT_SECRET as string,
            { expiresIn: `${appConfig.auth.deviceTokenDays}d` }
        );

        // Store in database
        user.deviceAccessToken = deviceToken;
        await user.save();

        // Set cookie
        res.cookie("device_token", deviceToken, {
            maxAge: appConfig.auth.deviceTokenDays * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        return res.status(200).json({
            message: "Device registered successfully",
            token: deviceToken,
        });
    } catch (error) {
        console.error("registerDevice error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const verifyDevice = async (req: Request, res: Response) => {
    try {
        const { token, userId } = req.body;

        if (!token || !userId) {
            return res.status(400).json({ message: "Token and User ID are required" });
        }

        const user = await User.findById(userId);
        if (!user || user.deviceAccessToken !== token) {
            return res.status(401).json({ message: "Invalid device token" });
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET as string);
        } catch (err) {
            return res.status(401).json({ message: "Token expired or invalid" });
        }

        return res.status(200).json({ message: "Device verified" });
    } catch (error) {
        console.error("verifyDevice error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
