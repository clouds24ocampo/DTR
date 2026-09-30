import axiosInstance from "../../../axios/axiosInstance";
import { INotification, CreateNotificationDTO, UnreadCountResponse } from "../../../types/global/notification/notification.types";

export const getNotificationsApi = async (params?: {
  limit?: number;
  unreadOnly?: boolean;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.unreadOnly) queryParams.append("unreadOnly", "true");

  const queryString = queryParams.toString();
  const url = `api/notifications${queryString ? `?${queryString}` : ""}`;
  
  const response = await axiosInstance.get<{ success: boolean; data: INotification[] }>(url);
  return response;
};

export const getUnreadCountApi = async () => {
  const response = await axiosInstance.get<{ success: boolean; data: UnreadCountResponse }>(
    "api/notifications/unread-count"
  );
  return response;
};

export const createNotificationApi = async (payload: CreateNotificationDTO) => {
  const response = await axiosInstance.post<{ success: boolean; data: INotification }>(
    "api/notifications/create",
    payload
  );
  return response;
};

export const markNotificationAsReadApi = async (notificationId: string) => {
  const response = await axiosInstance.patch<{ success: boolean; data: INotification }>(
    `api/notifications/${notificationId}/read`
  );
  return response;
};

export const markAllNotificationsAsReadApi = async () => {
  const response = await axiosInstance.patch<{ success: boolean; data: { count: number } }>(
    "api/notifications/mark-all-read"
  );
  return response;
};

export const deleteNotificationApi = async (notificationId: string) => {
  const response = await axiosInstance.delete<{ success: boolean; message: string }>(
    `api/notifications/${notificationId}`
  );
  return response;
};

