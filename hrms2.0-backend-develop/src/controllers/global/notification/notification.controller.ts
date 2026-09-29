import { NextFunction, Request, Response } from "express";
import { CustomRequest } from "src/types/global/express/express.type";
import { ServiceError } from "src/utils/global/error";
import {
  createNotificationService,
  getNotificationsByUserIdService,
  getUnreadCountService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
} from "../../../services/global/notification/notification.service";
import { CreateNotificationDTO } from "../../../types/global/notification/notification.types";

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

const sendOk = (res: Response, data: any) =>
  res.status(200).json({ success: true, data });

const sendCreated = (res: Response, data: any) =>
  res.status(201).json({ success: true, data });

const handleControllerError = (
  err: unknown,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ServiceError) {
    const anyErr = err as unknown as {
      status?: number;
      statusCode?: number;
      message: string;
    };
    const code = anyErr.status ?? anyErr.statusCode ?? 400;
    return res.status(code).json({ success: false, message: err.message });
  }
  return res
    .status(500)
    .json({ success: false, message: "Internal server error" });
};

// Get all notifications for the authenticated user
export const getNotificationsController = asyncHandler(
  async (req: CustomRequest, res, next) => {
    try {
      const userId = req.account?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { limit, unreadOnly } = req.query;
      const notifications = await getNotificationsByUserIdService(userId, {
        limit: limit ? parseInt(limit as string) : undefined,
        unreadOnly: unreadOnly === "true",
      });

      sendOk(res, notifications);
    } catch (err) {
      handleControllerError(err, res, next);
    }
  }
);

// Get unread count for the authenticated user
export const getUnreadCountController = asyncHandler(
  async (req: CustomRequest, res, next) => {
    try {
      const userId = req.account?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const count = await getUnreadCountService(userId);
      sendOk(res, { count });
    } catch (err) {
      handleControllerError(err, res, next);
    }
  }
);

// Create a notification (admin/system use)
export const createNotificationController = asyncHandler(
  async (req: CustomRequest, res, next) => {
    try {
      const payload = req.body as CreateNotificationDTO;
      const notification = await createNotificationService(payload);
      sendCreated(res, notification);
    } catch (err) {
      handleControllerError(err, res, next);
    }
  }
);

// Mark a notification as read
export const markNotificationAsReadController = asyncHandler(
  async (req: CustomRequest, res, next) => {
    try {
      const userId = req.account?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { notificationId } = req.params;
      const notification = await markNotificationAsReadService(
        notificationId,
        userId
      );
      sendOk(res, notification);
    } catch (err) {
      handleControllerError(err, res, next);
    }
  }
);

// Mark all notifications as read
export const markAllNotificationsAsReadController = asyncHandler(
  async (req: CustomRequest, res, next) => {
    try {
      const userId = req.account?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = await markAllNotificationsAsReadService(userId);
      sendOk(res, result);
    } catch (err) {
      handleControllerError(err, res, next);
    }
  }
);

// Delete a notification
export const deleteNotificationController = asyncHandler(
  async (req: CustomRequest, res, next) => {
    try {
      const userId = req.account?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { notificationId } = req.params;
      await deleteNotificationService(notificationId, userId);
      sendOk(res, { message: "Notification deleted successfully" });
    } catch (err) {
      handleControllerError(err, res, next);
    }
  }
);

