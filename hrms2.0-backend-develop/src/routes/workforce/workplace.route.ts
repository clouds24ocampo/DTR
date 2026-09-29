import express from "express";
import protectRoute from "src/middleware/protectedRoute";
import {
  assignToWorkstation,
  createWorkplace,
  deleteWorkplace,
  deleteWorkstation,
  getWorkplaceByDate,
  selfAssignToStation,
  selfUnassignFromStation,
  unassignUser,
  updateWorkplace,
  updateWorkstation,
  viewAllWorkplace,
} from "../../controllers/workforce/workplace/workplace.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = express.Router();

router.post(
  "/create",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  createWorkplace
);

router.post(
  "/:workplaceId/assign",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  assignToWorkstation
);

router.get(
  "/:workplaceId/day/:date",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  getWorkplaceByDate
);

router.get(
  "/",
  protectRoute,
  authMiddleware([
    "Workforce",
    "Operations Manager",
    "Frontline / Agent Roles",
    "Specialized Agent Roles",
  ]),
  viewAllWorkplace
);

router.delete(
  "/:workplaceId/workstations/:workstationId/:date/unassign/:userId",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  unassignUser
);

router.delete(
  "/:workplaceId",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  deleteWorkplace
);

router.delete(
  "/:workplaceId/workstations/:workstationId",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  deleteWorkstation
);

router.put(
  "/:workplaceId",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  updateWorkplace
);

router.put(
  "/:workplaceId/workstations/:workstationId",
  protectRoute,
  authMiddleware(["Workforce", "Operations Manager", "HR"]),
  updateWorkstation
);

router.post(
  "/:workplaceId/self-assign",
  protectRoute,
  authMiddleware(["Frontline / Agent Roles", "Specialized Agent Roles"]),
  selfAssignToStation
);

router.delete(
  "/:workplaceId/self-unassign/:date",
  protectRoute,
  authMiddleware(["Frontline / Agent Roles", "Specialized Agent Roles"]),
  selfUnassignFromStation
);

export default router;
