import express from "express";
import { registerDevice, verifyDevice } from "../../controllers/workforce/device.controller";
import protectRoute from "../../middleware/protectedRoute";

const router = express.Router();

// Only HR or admin should be able to register a device for someone
router.post("/register", protectRoute, registerDevice);

// Public interface can verify a device token
router.post("/verify", verifyDevice);

export default router;
