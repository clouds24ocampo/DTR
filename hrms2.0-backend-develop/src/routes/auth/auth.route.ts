import { Router } from "express";
import { login, logout } from "src/controllers/auth/auth.controller";
import {
  requestPasswordResetPin,
  verifyPasswordResetPin,
  resetPassword,
} from "src/controllers/auth/forgot-password.controller";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);

// Forgot password routes
router.post("/forgot-password/request-pin", requestPasswordResetPin);
router.post("/forgot-password/verify-pin", verifyPasswordResetPin);
router.post("/forgot-password/reset", resetPassword);

export default router;
