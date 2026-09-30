import { appConfig } from "src/config/app.config";
import { Router } from "express";
import { login, logout, registerSuperAdmin } from "src/controllers/auth/auth.controller";
import {
  requestPasswordResetPin,
  verifyPasswordResetPin,
  resetPassword,
} from "src/controllers/auth/forgot-password.controller";

import { rateLimit } from "src/middleware/rateLimit";

const router = Router();
const authLimiter = rateLimit(appConfig.auth.loginRateLimit.max, appConfig.auth.loginRateLimit.windowMs);
const pinLimiter = rateLimit(appConfig.auth.pinRateLimit.max, appConfig.auth.pinRateLimit.windowMs);

router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/register-admin", authLimiter, registerSuperAdmin);

// Forgot password routes
router.post("/forgot-password/request-pin", pinLimiter, requestPasswordResetPin);
router.post("/forgot-password/verify-pin", pinLimiter, verifyPasswordResetPin);
router.post("/forgot-password/reset", pinLimiter, resetPassword);

export default router;
