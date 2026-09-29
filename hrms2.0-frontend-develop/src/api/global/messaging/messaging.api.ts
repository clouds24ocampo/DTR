/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from "axios";
import axiosInstance from "../../../axios/axiosInstance";
import {
  Conversation,
  MessengerUser,
} from "../../../types/global/messaging/messaging.types";
import { AttachedFile, MessageIo } from "../../../types/global/messaging/messageio.types";
import { uploadFileInChunks } from "../../../utils/global/chunkUploader";

// user accounts for messaging
export const fetchMessengerUsers = async () => {
  try {
    const response = await axiosInstance.get("api/messaging/all-user");
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching messenger users:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const createMessengerAccount = async (
  id: string | undefined,
  payload: MessengerUser
): Promise<boolean> => {
  try {
    const response = await axiosInstance.post(
      `/api/messaging/create-account/${id}`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

// conversation api section
export const fetchConversations = async () => {
  try {
    const response = await axiosInstance.get("api/messaging/all-conversations");
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching conversations:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const createConversationx = async (
  payload: Conversation
): Promise<any | false> => {
  try {
    const response = await axiosInstance.post(
      `/api/messaging/create-conversation`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

// message api section
export const fetchMessages = async () => {
  try {
    const response = await axiosInstance.get("api/messaging/all-messages");
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching messages:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const createMessage = async (
  payload: MessageIo
): Promise<any | false> => {
  try {
    const { data } = await axiosInstance.post(
      "/api/messaging/create-message",
      payload
    );
    return data?.document ?? false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const reactEmoji = async (payload: any): Promise<any | false> => {
  try {
    const { data } = await axiosInstance.put(
      "/api/messaging/reaction-emoji",
      payload
    );
    return data?.document ?? false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const removeReactionEmoji = async (payload: {
  messageId: string;
  emoji: string;
  userId: string;
  conversationId: string;
}): Promise<any | false> => {
  try {
    const { data } = await axiosInstance.put(
      "/api/messaging/remove-reaction",
      payload
    );
    return data?.document ?? false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const attachFile = async (
  selectedId: string,
  payload: any,
  files: File[]
): Promise<AttachedFile[] | false> => {
  try {
    if (!files || files.length === 0) return false;

    const attachedFiles: AttachedFile[] = [];

    for (const file of files) {
      const fileToken = await uploadFileInChunks(file, "hrms/admin/messaging");
      attachedFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileToken,
      });
    }

    console.log("Attached files:", attachedFiles);
    const { data } = await axiosInstance.post(
      `/api/messaging/attach-files/${selectedId}`,
      {
        files: attachedFiles,
        payload,
      }
    );

    return data?.document ?? false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const markMessageAsSeen = async (
  messageId: string,
  conversationId: string
): Promise<any | false> => {
  try {
    const { data } = await axiosInstance.put("/api/messaging/mark-seen", {
      messageId,
      conversationId,
    });
    return data?.document ?? false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<any | false> => {
  try {
    const { data } = await axiosInstance.put("/api/messaging/mark-conversation-read", {
      conversationId,
      userId,
    });
    return data?.document ?? false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};