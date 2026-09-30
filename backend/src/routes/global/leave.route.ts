import express from "express";
import protectRoute from "src/middleware/protectedRoute";
import {
  createLeaveController,
  editLeaveController,
  getAllLeavesController,
  getLeavesByEmployeeIdController,
  getLeavesByStatusController,
  updateLeaveStatusController,
} from "../../controllers/global/leave/leave.controller";

const router = express.Router();

router.get("/", protectRoute, getAllLeavesController);

router.get(
  "/employee/:employeeId",
  protectRoute,
  getLeavesByEmployeeIdController
);

router.get("/status/:status", protectRoute, getLeavesByStatusController);

router.post("/create", protectRoute, createLeaveController);

router.put("/:leaveId", protectRoute, editLeaveController);

router.patch("/:leaveId/status", protectRoute, updateLeaveStatusController);

export default router;
