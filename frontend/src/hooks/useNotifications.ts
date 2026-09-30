/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from "react";
import { INotification } from "../types/global/notification/notification.types";
import { ServerToClientEvents } from "../types/global/messaging/messageio.types";
import useAuthStore from "../stores/auth/auth.store";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  deleteNotificationApi,
} from "../api/global/notification/notification.api";
import { connectSocket } from "../socket";
import { Socket } from "socket.io-client";

interface UseNotificationsReturn {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket<ServerToClientEvents> | null>(null);
  const { account } = useAuthStore();

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!account?._id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getNotificationsApi({ limit: 50 });
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch notifications");
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [account?._id]);

  // Fetch unread count from API
  const fetchUnreadCount = useCallback(async () => {
    if (!account?._id) return;

    try {
      const response = await getUnreadCountApi();
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (err: any) {
      console.error("Error fetching unread count:", err);
    }
  }, [account?._id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await markNotificationAsReadApi(notificationId);
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error("Error marking notification as read:", err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await markAllNotificationsAsReadApi();
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            read: true,
            readAt: new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      }
    } catch (err: any) {
      console.error("Error marking all notifications as read:", err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await deleteNotificationApi(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      // Update unread count if the deleted notification was unread
      const deleted = notifications.find((n) => n._id === notificationId);
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error("Error deleting notification:", err);
      throw err;
    }
  }, [notifications]);

  // Setup Socket.IO connection and listeners
  useEffect(() => {
    if (!account?._id) {
      return;
    }

    // Connect socket
    const socket = connectSocket(account._id.toString());
    socketRef.current = socket;

    // Listen for new notifications
    socket.on("notification:new", (notification: INotification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for notification updates
    socket.on("notification:update", (notification: INotification) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? notification : n))
      );
    });

    // Listen for unread count updates
    socket.on("notification:unread-count", (payload: { count: number }) => {
      setUnreadCount(payload.count);
    });

    // Initial fetch
    fetchNotifications();
    fetchUnreadCount();

    // Cleanup on unmount
    return () => {
      socket.off("notification:new");
      socket.off("notification:update");
      socket.off("notification:unread-count");
      socket.disconnect();
    };
  }, [account?._id, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications,
    refreshUnreadCount: fetchUnreadCount,
  };
};

