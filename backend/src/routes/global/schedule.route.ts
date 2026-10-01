import { rateLimit } from "src/middleware/rateLimit";
import express from "express";
import {
  createSchedulesForUsers,
  deleteSchedule,
  editSchedule,
  editSingleSession,
  getAllSchedules,
  getMySchedulesByDate,
  getSchedulesByDate,
  getSchedulesByUserAndDate,
  getSchedulesByUserId,
  triggerAutoSchedule,
} from "src/controllers/global/schedule/schedule.controller";
import protectRoute from "src/middleware/protectedRoute";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = express.Router();

router.post(
  "/create",
  protectRoute,
  authMiddleware(["Workforce", "Operation Manager"]),
  createSchedulesForUsers
);

router.get(
  "/",
  protectRoute,
  authMiddleware(["Workforce", "Operation Manager"]),
  getAllSchedules
);

router.get(
  "/user/:userId",
  protectRoute,
  authMiddleware(["Workforce", "Operation Manager"]),
  getSchedulesByUserId
);

router.get(
  "/date/:date",
  protectRoute,
  authMiddleware(["Workforce", "Operation Manager"]),
  getSchedulesByDate
);

// Any authenticated user can view their own schedule
router.get("/me/date/:date", protectRoute, getMySchedulesByDate);

// Clock page (kiosk: true) is public and returns minimal fields; every other
// use (HR screens, date ranges, full schedule docs) requires login.
// ponytail: 60/min per IP, sized for a shared office network at shift change; tighten if abused.
router.post(
  "/filtered",
  rateLimit(60, 60_000),
  (req, res, next) => (req.body?.kiosk === true ? next() : protectRoute(req, res, next)),
  getSchedulesByUserAndDate
);

router.post(
  "/auto-schedule",
  protectRoute,
  authMiddleware([
    "Employee",
    "Team Leader",
    "HR",
    "Workforce",
    "Operation Manager",
    "Frontline / Agent Roles",
    "Specialized Agent Roles",
    "Employee - Field",
    "Employee - Operation",
  ]),
  triggerAutoSchedule
);

router.patch(
  "/:scheduleId/sessions/:sessionId",
  protectRoute,
  authMiddleware(["Workforce", "Operation Manager"]),
  editSingleSession
);

router.put(
  "/edit",
  protectRoute,
  authMiddleware(["Workforce", "Operation Manager"]),
  editSchedule
);

router.delete(
  "/:scheduleId/delete",
  protectRoute,
  authMiddleware(["Workforce", "Operation Manager"]),
  deleteSchedule
);

export default router;
