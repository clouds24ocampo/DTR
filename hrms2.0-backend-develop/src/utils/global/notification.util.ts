import { io } from "../../index";
import { INotification } from "../../types/global/notification/notification.types";

/**
 * Send a notification to a user via Socket.IO
 * @param notification - The notification object to send
 */
export const sendNotificationViaSocket = (notification: INotification): void => {
  try {
    const roomName = `user:${notification.userId}`;
    io.to(roomName).emit("notification:new", notification);
    console.log(`[Socket] Notification sent to user ${notification.userId} in room ${roomName}`);
  } catch (error) {
    console.error("[Socket] Error sending notification:", error);
  }
};

/**
 * Send notification update (e.g., read status change) to a user via Socket.IO
 * @param userId - The user ID to send the update to
 * @param notification - The updated notification object
 */
export const sendNotificationUpdateViaSocket = (
  userId: string,
  notification: INotification
): void => {
  try {
    const roomName = `user:${userId}`;
    io.to(roomName).emit("notification:update", notification);
    console.log(`[Socket] Notification update sent to user ${userId} in room ${roomName}`);
  } catch (error) {
    console.error("[Socket] Error sending notification update:", error);
  }
};

/**
 * Send unread count update to a user via Socket.IO
 * @param userId - The user ID to send the update to
 * @param count - The new unread count
 */
export const sendUnreadCountUpdateViaSocket = (
  userId: string,
  count: number
): void => {
  try {
    const roomName = `user:${userId}`;
    io.to(roomName).emit("notification:unread-count", { count });
    console.log(`[Socket] Unread count update sent to user ${userId}: ${count}`);
  } catch (error) {
    console.error("[Socket] Error sending unread count update:", error);
  }
};

