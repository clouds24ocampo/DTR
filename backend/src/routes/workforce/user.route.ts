import { uploadLimits } from "src/config/app.config";
import express from "express";
import multer from "multer";
import { registerEmployee } from "../../controllers/workforce/user/user-auth.controller";
import {
  getActiveEmployees,
  getAllEmployees,
  getArchivedEmployees,
  getOwnData,
  getUserProfile,
} from "../../controllers/workforce/user/user-retrieve.controller";
import {
  archiveEmployee,
  unarchiveEmployee,
  updateEmployee,
  updateEmployeeProfile,
  switchRole,
  deleteEmployee,
} from "../../controllers/workforce/user/user-update.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import protectRoute from "../../middleware/protectedRoute";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: uploadLimits });

router.get("/:id([0-9a-fA-F]{24})", protectRoute, getUserProfile);

router.get("/profile/me", protectRoute, getOwnData);

router.get(
  "/",
  protectRoute,
  getAllEmployees
);

router.get(
  "/active",
  protectRoute,
  authMiddleware(["HR", "Operations Manager", "Workforce"]),
  getActiveEmployees
);

router.get(
  "/archived",
  protectRoute,
  authMiddleware(["HR", "Operations Manager", "Workforce"]),
  getArchivedEmployees
);

router.post("/register/hr", protectRoute, authMiddleware(["HR"]), registerEmployee);

router.post("/register", protectRoute, authMiddleware(["HR"]), registerEmployee);

router.put("/profile/:id", protectRoute, upload.single("image"), updateEmployeeProfile);


router.put("/switch-role", protectRoute, switchRole);

router.put("/update-employee/:employeeId", protectRoute, authMiddleware(["HR", "Operation Manager"]), updateEmployee);

router.put(
  "/archive/:employeeId",
  protectRoute,
  authMiddleware(["HR", "Workforce", "Operation Manager"]),
  archiveEmployee
);

router.put(
  "/unarchive/:employeeId",
  protectRoute,
  authMiddleware(["HR", "Workforce", "Operation Manager"]),
  unarchiveEmployee
);

router.delete(
  "/delete/:employeeId",
  protectRoute,
  authMiddleware(["HR", "Workforce", "Operation Manager"]),
  deleteEmployee
);

export default router;
