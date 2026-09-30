import { ServiceError } from "src/utils/global/error";
import Notification from "../../../models/global/notification.model";
import {
  INotification,
  CreateNotificationDTO,
  UpdateNotificationDTO,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "../../../types/global/notification/notification.types";
import {
  sendNotificationViaSocket,
  sendNotificationUpdateViaSocket,
  sendUnreadCountUpdateViaSocket,
} from "../../../utils/global/notification.util";

/* ----------------------------- Validators ----------------------------- */

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const assertInEnum = <T extends readonly string[]>(
  value: string,
  allowed: T,
  fieldName: string
) => {
  if (!allowed.includes(value)) {
    throw new ServiceError(
      `${fieldName} must be one of: ${allowed.join(", ")}`,
      400
    );
  }
};

const validateCreateNotification = (payload: CreateNotificationDTO) => {
  if (!isNonEmptyString(payload.userId))
    throw new ServiceError("userId is required", 400);
  if (!isNonEmptyString(payload.title))
    throw new ServiceError("title is required", 400);
  if (!isNonEmptyString(payload.body))
    throw new ServiceError("body is required", 400);
  if (!payload.type) throw new ServiceError("type is required", 400);
  assertInEnum(payload.type, NOTIFICATION_TYPES, "type");
  if (payload.priority) {
    assertInEnum(payload.priority, NOTIFICATION_PRIORITIES, "priority");
  }
};

const toSafeNotification = (raw: any): INotification => ({
  _id: String(raw._id ?? raw.id ?? ""),
  userId: raw.userId,
  type: raw.type,
  title: raw.title,
  body: raw.body,
  fromName: raw.fromName ?? undefined,
  fromId: raw.fromId ?? undefined,
  priority: raw.priority ?? "medium",
  read: raw.read ?? false,
  readAt: raw.readAt ? new Date(raw.readAt) : undefined,
  link: raw.link ?? undefined,
  metadata: raw.metadata ?? {},
  createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
  updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
});

/* ----------------------------- Services ----------------------------- */

export const createNotificationService = async (
  payload: CreateNotificationDTO
): Promise<INotification> => {
  try {
    validateCreateNotification(payload);

    const notification = await Notification.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      fromName: payload.fromName,
      fromId: payload.fromId,
      priority: payload.priority ?? "medium",
      link: payload.link,
      metadata: payload.metadata ?? {},
      read: false,
    });

    const safeNotification = toSafeNotification(notification);
    
    // Send notification via Socket.IO
    sendNotificationViaSocket(safeNotification);
    
    // Send unread count update
    const unreadCount = await Notification.countDocuments({
      userId: payload.userId,
      read: false,
    });
    sendUnreadCountUpdateViaSocket(payload.userId, unreadCount);

    return safeNotification;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to create notification", 500);
  }
};

export const getNotificationsByUserIdService = async (
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<INotification[]> => {
  try {
    if (!isNonEmptyString(userId))
      throw new ServiceError("userId is required", 400);

    const query: any = { userId };
    if (options?.unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit ?? 100)
      .lean();

    return notifications.map(toSafeNotification);
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to get notifications", 500);
  }
};

export const getUnreadCountService = async (
  userId: string
): Promise<number> => {
  try {
    if (!isNonEmptyString(userId))
      throw new ServiceError("userId is required", 400);

    const count = await Notification.countDocuments({
      userId,
      read: false,
    });

    return count;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to get unread count", 500);
  }
};

export const markNotificationAsReadService = async (
  notificationId: string,
  userId: string
): Promise<INotification> => {
  try {
    if (!isNonEmptyString(notificationId))
      throw new ServiceError("notificationId is required", 400);
    if (!isNonEmptyString(userId))
      throw new ServiceError("userId is required", 400);

    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification)
      throw new ServiceError("Notification not found", 404);

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    const safeNotification = toSafeNotification(notification);
    
    // Send notification update via Socket.IO
    sendNotificationUpdateViaSocket(userId, safeNotification);
    
    // Send unread count update
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });
    sendUnreadCountUpdateViaSocket(userId, unreadCount);

    return safeNotification;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to mark notification as read", 500);
  }
};

export const markAllNotificationsAsReadService = async (
  userId: string
): Promise<{ count: number }> => {
  try {
    if (!isNonEmptyString(userId))
      throw new ServiceError("userId is required", 400);

    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    // Send unread count update (should be 0 now)
    sendUnreadCountUpdateViaSocket(userId, 0);

    return { count: result.modifiedCount };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to mark all notifications as read", 500);
  }
};

export const deleteNotificationService = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  try {
    if (!isNonEmptyString(notificationId))
      throw new ServiceError("notificationId is required", 400);
    if (!isNonEmptyString(userId))
      throw new ServiceError("userId is required", 400);

    const result = await Notification.deleteOne({
      _id: notificationId,
      userId,
    });

    if (result.deletedCount === 0)
      throw new ServiceError("Notification not found", 404);
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to delete notification", 500);
  }
};

