import express from "express";
import protectRoute from "../../middleware/protectedRoute";
import { authMiddleware } from "../../middleware/auth.middleware";
import * as ProgressReportController from "../../controllers/global/progress/progress-report.controller";

const router = express.Router();

// Apply protection to all routes
router.use(protectRoute);

// Employee routes
router.get("/my-reports", ProgressReportController.getMyReports);
router.post("/create", ProgressReportController.createReportFromCookie);
router.get("/check-exists", ProgressReportController.checkExists);

// HR/Admin routes
router.get("/", authMiddleware(["HR", "Team Leader", "Workforce", "Operation Manager"]), ProgressReportController.getAllReports);
router.get("/:id", ProgressReportController.getReportById);
router.post("/", authMiddleware(["HR", "Team Leader", "Workforce", "Operation Manager"]), ProgressReportController.createReport);
router.patch("/:id", ProgressReportController.updateReport);
router.patch("/:id/review", authMiddleware(["HR", "Team Leader", "Workforce", "Operation Manager"]), ProgressReportController.reviewReport);
router.delete("/:id", ProgressReportController.deleteReport);

export default router;
