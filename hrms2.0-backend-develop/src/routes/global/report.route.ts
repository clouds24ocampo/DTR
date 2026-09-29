// src/routes/report.route.ts
import express from "express";
import protectRoute from "src/middleware/protectedRoute";
import {
  createReportFromBody,
  createReportFromCookie,
  getAllReports,
  getMyReports,
  getReportsByEmployeeId,
  getReportsByStatus,
  updateReport,
} from "../../controllers/global/report/report.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = express.Router();

/* ---------------------------------- CREATE --------------------------------- */
// Accept reporter identity from request body (fits your sample UI)
router.post(
  "/create",
  protectRoute,
  authMiddleware([
    "Employee",
    "Team Leader",
    "HR",
    "Workforce",
    "Operation Manager",
    "Employee - Field",
    "Employee - Operation",
  ]),
  createReportFromBody
);

// Derive reporter identity from cookie/session
router.post(
  "/create/self",
  protectRoute,
  authMiddleware([
    "Employee",
    "Team Leader",
    "HR",
    "Workforce",
    "Operation Manager",
    "Employee - Field",
    "Employee - Operation",
  ]),
  createReportFromCookie
);

/* ----------------------------------- READ ---------------------------------- */
router.get(
  "/",
  protectRoute,
  // authMiddleware(["Workforce", "Team Leader", "HR", "Operation Manager"]),
  getAllReports
);

router.get(
  "/me",
  protectRoute,
  authMiddleware([
    "Employee",
    "Team Leader",
    "HR",
    "Workforce",
    "Operation Manager",
    "Employee - Field",
    "Employee - Operation",
  ]),
  getMyReports
);

router.get(
  "/employee/:employeeId",
  protectRoute,
  authMiddleware(["Team Leader", "Workforce", "Operation Manager"]),
  getReportsByEmployeeId
);

router.get(
  "/status/:status",
  protectRoute,
  authMiddleware(["Team Leader", "HR", "Workforce", "Operation Manager"]),
  getReportsByStatus
);

/* ---------------------------------- UPDATE --------------------------------- */
router.patch(
  "/:reportId",
  protectRoute,
  authMiddleware(["Team Leader", "HR", "Workforce", "Operation Manager"]),
  updateReport
);

export default router;
