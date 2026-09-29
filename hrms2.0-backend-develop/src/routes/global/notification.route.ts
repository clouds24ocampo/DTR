import express from "express";
import protectRoute from "src/middleware/protectedRoute";
import {
  getNotificationsController,
  getUnreadCountController,
  createNotificationController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
} from "../../controllers/global/notification/notification.controller";

const router = express.Router();

// Get all notifications for authenticated user
router.get("/", protectRoute, getNotificationsController);

// Get unread count
router.get("/unread-count", protectRoute, getUnreadCountController);

// Create notification (admin/system)
router.post("/create", protectRoute, createNotificationController);

// Mark notification as read
router.patch("/:notificationId/read", protectRoute, markNotificationAsReadController);

// Mark all notifications as read
router.patch("/mark-all-read", protectRoute, markAllNotificationsAsReadController);

// Delete notification
router.delete("/:notificationId", protectRoute, deleteNotificationController);

export default router;

