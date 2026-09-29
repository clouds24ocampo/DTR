/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { INotification } from "../../../types/global/notification/notification.types";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
} from "../../../api/global/notification/notification.api";
import { Socket } from "socket.io-client";
import { ServerToClientEvents } from "../../../types/global/messaging/messageio.types";

interface NotificationStore {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  socket: Socket<ServerToClientEvents, any> | null;

  setSocket: (socket: Socket<ServerToClientEvents, any> | null) => void;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: INotification) => void;
  updateNotification: (notification: INotification) => void;
  updateUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  socket: null,

  setSocket: (socket) => {
    set({ socket });
    
    if (socket) {
      // Listen for new notifications
      socket.on("notification:new", (notification: INotification) => {
        const { notifications } = get();
        // Add to the beginning of the list
        set({ 
          notifications: [notification, ...notifications],
          unreadCount: get().unreadCount + 1,
        });
      });

      // Listen for notification updates
      socket.on("notification:update", (notification: INotification) => {
        const { notifications } = get();
        set({
          notifications: notifications.map((n) =>
            n._id === notification._id ? notification : n
          ),
        });
      });

      // Listen for unread count updates
      socket.on("notification:unread-count", (payload: { count: number }) => {
        set({ unreadCount: payload.count });
      });
    }
  },

  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const response = await getNotificationsApi({ limit: 50 });
      if (response.data.success) {
        set({ notifications: response.data.data });
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch notifications" });
    } finally {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await getUnreadCountApi();
      if (response.data.success) {
        set({ unreadCount: response.data.data.count });
      }
    } catch (error: any) {
      console.error("Failed to fetch unread count:", error);
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await markNotificationAsReadApi(notificationId);
      const { notifications, unreadCount } = get();
      set({
        notifications: notifications.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, unreadCount - 1),
      });
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  markAllAsRead: async () => {
    try {
      await markAllNotificationsAsReadApi();
      const { notifications } = get();
      set({
        notifications: notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      });
    } catch (error: any) {
      console.error("Failed to mark all notifications as read:", error);
    }
  },

  addNotification: (notification: INotification) => {
    const { notifications } = get();
    set({
      notifications: [notification, ...notifications],
      unreadCount: get().unreadCount + 1,
    });
  },

  updateNotification: (notification: INotification) => {
    const { notifications } = get();
    set({
      notifications: notifications.map((n) =>
        n._id === notification._id ? notification : n
      ),
    });
  },

  updateUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },
}));

