/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Conversation,
  MessengerUser,
} from "../types/global/messaging/messaging.types";
import {
  MessageIo,
  ServerToClientEvents,
} from "../types/global/messaging/messageio.types";
import { useFetchData } from "./useFetchData";
import useAuthStore from "../stores/auth/auth.store";
import {
  attachFile,
  createConversationx,
  createMessage,
  createMessengerAccount,
  reactEmoji,
  removeReactionEmoji,
  markConversationAsRead,
} from "../api/global/messaging/messaging.api";
import toast from "react-hot-toast";
import { connectSocket } from "../socket";
import { Socket } from "socket.io-client";
import useMessagingStore from "../stores/global/messaging/messaging.store";
import { triggerChatNotification } from "../components/global/notification/push/PushNotifications";

interface WebSocketHook {
  messages: { [conversationId: string]: MessageIo[] };
  conversations: Conversation[];
  users: MessengerUser[];
  connectionStatus: "connecting" | "connected" | "disconnected";
  sendMessage: (conversationId: string, content: string) => void;
  addReaction: (
    messageId: string,
    emoji: string,
    userId: string,
    accountId: string
  ) => void;
  removeReaction: (
    messageId: string,
    emoji: string,
    accountId: string,
    conversationId: string
  ) => void;
  attachedFile: (selectedId: string, file: File[]) => void;
  markAsRead: (conversationId: string) => void;
  createConversation: (user: MessengerUser) => Promise<string>;
  registerAccount: () => Promise<void>;
  selectedConvo: string;
  loading: boolean;
  setLoading: (value: boolean) => void;
  typingUsers: { [conversationId: string]: { userId: string; userName: string }[] };
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
}

export const useWebSocket = (): WebSocketHook => {
  const {
    messages,
    conversations,
    users,
    selectedConvo,
    loading,
    setMessages,
    setConversations,
    setUsers,
    setSelectedConvo,
    setLoading,
  } = useMessagingStore();

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: { userId: string; userName: string }[] }>({});

  const { account } = useAuthStore();
  const {
    filteredMessengerUsers,
    filteredConversations,
    filteredMessages,
  } = useFetchData();
  const socketRef = useRef<Socket<ServerToClientEvents> | null>(null);

  const groupedMessages = useMemo(() => {
    const map: Record<string, MessageIo[]> = {};
    for (const msg of filteredMessages) {
      (map[msg.conversationId] ||= []).push(msg);
    }
    return map;
  }, [filteredMessages]);

  useEffect(() => {
    // Only update if we have data, and merge messages instead of replacing
    if (filteredMessengerUsers.length > 0) {
      setUsers(filteredMessengerUsers);
    }
    if (filteredConversations.length > 0) {
      setConversations(filteredConversations);
    }
    // Merge messages instead of replacing to prevent flickering
    if (Object.keys(groupedMessages).length > 0) {
      setMessages((prev) => {
        const merged = { ...prev };
        Object.keys(groupedMessages).forEach((convId) => {
          const existing = prev[convId] || [];
          const incoming = groupedMessages[convId] || [];
          // Merge and deduplicate by _id
          const existingIds = new Set(existing.map((m) => m._id));
          const newMessages = incoming.filter((m) => m._id && !existingIds.has(m._id));
          merged[convId] = [...existing, ...newMessages].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
        return merged;
      });
    }
  }, [filteredMessengerUsers, filteredConversations, groupedMessages, setUsers, setConversations, setMessages]);

  useEffect(() => {
    if (!account?._id) return;

    setConnectionStatus("connecting");
    const socket = connectSocket(account._id);
    socketRef.current = socket;

    const onConnect = () => setConnectionStatus("connected");
    const onDisconnect = () => setConnectionStatus("disconnected");

    const onMessage = (msgOrMsgs: MessageIo | MessageIo[]) => {
      const arr = Array.isArray(msgOrMsgs) ? msgOrMsgs : [msgOrMsgs];
      const conversationId = arr[0]?.conversationId;
      if (!conversationId) return;

      arr.forEach((msg) => {
        if (msg.senderId !== account._id) {
          triggerChatNotification(msg);
        }
      });

      // Use appendMessage to prevent overwriting existing messages
      setMessages((prev) => {
        const existing = prev[conversationId] || [];
        const existingIds = new Set(existing.map((m) => m._id).filter(Boolean));
        // Filter out duplicates
        const newMessages = arr.filter((m) => m._id && !existingIds.has(m._id));
        if (newMessages.length === 0) return prev;

        return {
          ...prev,
          [conversationId]: [...existing, ...newMessages].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
        };
      });
    };

    const onReaction = (msgOrMsgs: MessageIo | MessageIo[]) => {
      const arr = Array.isArray(msgOrMsgs) ? msgOrMsgs : [msgOrMsgs];
      const conversationId = arr[0]?.conversationId;
      if (!conversationId) return;

      setMessages((prev) => {
        const existingMsgs = prev[conversationId] || [];
        if (existingMsgs.length === 0) return prev; // Don't update if no messages exist

        const updatedMsgs = existingMsgs.map((msg) => {
          const incoming = arr.find((m) => m._id === msg._id);
          if (incoming) {
            return { ...msg, reactions: incoming.reactions };
          }
          return msg;
        });

        return { ...prev, [conversationId]: updatedMsgs };
      });
    };

    const onConvo = (msgOrMsgs: Conversation | Conversation[]) => {
      const arr = Array.isArray(msgOrMsgs) ? msgOrMsgs : [msgOrMsgs];
      // Get the current selectedConvo from the store to ensure we have the latest value
      const currentSelectedConvo = useMessagingStore.getState().selectedConvo;

      setConversations((prev) =>
        prev.map((conv) => {
          const related = arr.filter((msg) => msg._id === conv._id);
          if (!related.length) return conv;

          const lastMsg = related[related.length - 1];
          // Check if the sender is the current user
          const isOwnMessage = lastMsg.senderId === account?._id;
          // Check if this conversation is currently selected/opened
          const isCurrentlySelected = currentSelectedConvo === conv._id;

          // Use the unread count from the backend (lastMsg.unread)
          // But if the conversation is currently selected, set it to 0
          // If it's the user's own message, also set to 0
          let unreadCount = lastMsg.unread ?? conv.unread ?? 0;
          if (isCurrentlySelected || isOwnMessage) {
            unreadCount = 0;
          }

          return {
            ...conv,
            lastMessage: lastMsg.lastMessage,
            senderId: lastMsg.senderId,
            timestamp: lastMsg.timestamp,
            unread: unreadCount,
          };
        })
      );
    };

    const onNewAccount = (msgOrMsgs: MessengerUser | MessengerUser[]) => {
      const arr = Array.isArray(msgOrMsgs) ? msgOrMsgs : [msgOrMsgs];
      const validUsers = arr.filter(
        (u): u is MessengerUser & { _id: string } => typeof u._id === "string"
      );
      if (validUsers.length) setUsers(arr);
    };

    const onTypingStart = (payload: { conversationId: string; userId: string; userName: string }) => {
      if (payload.userId === account?._id) return; // Don't show own typing indicator
      setTypingUsers((prev) => {
        const current = prev[payload.conversationId] || [];
        const exists = current.some((u) => u.userId === payload.userId);
        if (exists) return prev;
        return {
          ...prev,
          [payload.conversationId]: [...current, { userId: payload.userId, userName: payload.userName }],
        };
      });
    };

    const onTypingStop = (payload: { conversationId: string; userId: string }) => {
      setTypingUsers((prev) => {
        const current = prev[payload.conversationId] || [];
        return {
          ...prev,
          [payload.conversationId]: current.filter((u) => u.userId !== payload.userId),
        };
      });
    };

    const onMessageSeen = (msgOrMsgs: MessageIo | MessageIo[]) => {
      const arr = Array.isArray(msgOrMsgs) ? msgOrMsgs : [msgOrMsgs];
      const conversationId = arr[0]?.conversationId;
      if (!conversationId) return;

      setMessages((prev) => {
        const existingMsgs = prev[conversationId] || [];
        if (existingMsgs.length === 0) return prev;

        const updatedMsgs = existingMsgs.map((msg) => {
          const incoming = arr.find((m) => m._id === msg._id);
          if (incoming) {
            return { ...msg, isSeen: incoming.isSeen };
          }
          return msg;
        });

        return { ...prev, [conversationId]: updatedMsgs };
      });
    };

    const onConversationNew = (conversation: Conversation) => {
      const convoId =
        conversation._id != null ? String(conversation._id) : "";
      if (!convoId) return;
      const myId = account?._id;
      const isParticipant = conversation.participants?.some(
        (p) => String(p) === String(myId)
      );
      if (!myId || !isParticipant) return;

      setConversations((prev) => {
        const exists = prev.some((c) => String(c._id) === convoId);
        if (exists) return prev;
        const normalized = {
          ...conversation,
          _id: convoId,
          participants: conversation.participants ?? [],
        };
        return [normalized, ...prev];
      });
      setMessages((prev) => {
        if (prev[convoId]) return prev;
        return { ...prev, [convoId]: [] };
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessage);
    socket.on("convo:last-message", onConvo);
    socket.on("conversation:new", onConversationNew);
    socket.on("message:reaction", onReaction);
    socket.on("message:seen", onMessageSeen);
    socket.on("account:new", onNewAccount);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessage);
      socket.off("convo:last-message", onConvo);
      socket.off("conversation:new", onConversationNew);
      socket.off("message:reaction", onReaction);
      socket.off("message:seen", onMessageSeen);
      socket.off("account:new", onNewAccount);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.disconnect();
    };
  }, [account?._id]);

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (connectionStatus !== "connected" || !content.trim()) return;
      try {
        const messageInput: MessageIo = {
          conversationId,
          senderId: account?._id || "",
          senderName: account?.firstName || "",
          content: content.trim(),
          timestamp: new Date().toISOString(),
          isOwn: account?.email || "",
          createdAt: "",
        };
        const success = await createMessage(messageInput);
        success
          ? toast.success("Message sent!")
          : toast.error("Failed to send message");
      } catch (error: any) {
        toast.error(error?.message || "An error occurred");
      }
    },
    [connectionStatus, account]
  );

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!account?._id) return;

      // Update local state immediately for better UX
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, unread: 0 } : conv
        )
      );

      // Call backend API to persist the change
      try {
        await markConversationAsRead(conversationId, account._id);
      } catch (error) {
        console.error("Error marking conversation as read:", error);
        // Revert on error - restore previous unread count
        // We'll let the backend sync handle this via socket events
      }
    },
    [setConversations, account?._id]
  );

  const createConversation = useCallback(
    async (user: MessengerUser): Promise<string> => {
      const selectedUser = filteredMessengerUsers.find(
        (e) => e.messengerId === user.messengerId
      );
      const myId = String(account?._id);
      const otherId = String(selectedUser?.messengerId);

      const existing = conversations.find(
        (conv) =>
          conv.participants?.includes(myId) &&
          conv.participants?.includes(otherId)
      );
      if (!myId || !otherId) {
        toast.error("Invalid participants");
        return existing?._id ?? "";
      }

      if (existing) {
        setSelectedConvo((prev) =>
          prev !== existing._id ? existing._id! : prev
        );
        return existing._id!;
      }

      try {
        const accountInput = {
          name: user.name || "",
          lastMessage: "Start your conversation...",
          timestamp: new Date().toISOString(),
          unread: 0,
          avatar: user.avatar || "",
          participants: [myId, otherId],
          isOnline: user.isOnline,
          createdBy: myId,
        };

        const id = await createConversationx(accountInput);
        if (id) {
          const convId =
            typeof id === "string"
              ? id
              : (id as any)?._id != null
                ? String((id as any)._id)
                : "";
          if (!convId) {
            toast.error("Failed to create conversation");
            return "";
          }
          const newConv = { ...accountInput, _id: convId };
          toast.success("Conversation successfully created");
          setConversations((prev) => [newConv, ...prev]);
          setMessages((prev) => ({ ...prev, [convId]: [] }));
          setSelectedConvo(convId);
          return convId;
        } else {
          toast.error("Failed to create conversation");
          return "";
        }
      } catch (error: any) {
        toast.error(error?.message || "An error occurred");
        return "";
      }
    },
    [
      account?._id,
      account?.firstName,
      account?.lastName,
      conversations,
      filteredMessengerUsers,
      setConversations,
      setMessages,
      setSelectedConvo,
    ]
  );

  const addReaction = useCallback(
    async (
      messageId: string,
      emoji: string,
      userId: string,
      conversationId: string
    ) => {
      if (connectionStatus !== "connected" || !emoji.trim()) return;
      try {
        const emojiRes = { messageId, emoji, userId, conversationId };
        await reactEmoji(emojiRes);
      } catch (error: any) {
        toast.error(error?.message || "An error occurred");
      }
    },
    [connectionStatus]
  );

  const removeReaction = useCallback(
    async (
      messageId: string,
      emoji: string,
      accountId: string,
      conversationId: string
    ) => {
      if (connectionStatus !== "connected" || !emoji.trim()) return;
      try {
        await removeReactionEmoji({
          messageId,
          emoji,
          userId: accountId,
          conversationId,
        });
      } catch (error: any) {
        toast.error(error?.message || "An error occurred");
      }
    },
    [connectionStatus]
  );

  const attachedFile = useCallback(
    async (selectedId: string, file: File[]) => {
      try {
        const messageInput: MessageIo = {
          conversationId: selectedId,
          senderId: account?._id || "",
          senderName: account?.firstName || "",
          content: "",
          timestamp: new Date().toISOString(),
          isOwn: account?.email || "",
          createdAt: "",
        };
        await attachFile(selectedId, messageInput, file);
      } catch (error: any) {
        toast.error(error?.message || "An error occurred");
      }
    },
    [account?._id, account?.email, account?.firstName]
  );

  const registerAccount = useCallback(async () => {
    setLoading(true);
    try {
      const fullName = [account?.firstName, account?.lastName]
        .filter(Boolean)
        .join(" ");
      const initials = [account?.firstName?.[0], account?.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase();
      const messageInput: MessengerUser = {
        name: fullName,
        email: account?.email,
        position: account?.position?.[0],
        avatar: initials,
        messengerId: account?._id,
        isOnline: true,
        participants: [],
      };
      const res = await createMessengerAccount(account?._id, messageInput);
      if (res) setLoading(false);
    } catch (error: any) {
      toast.error(error?.message || "An error occurred");
    }
  }, [
    account?._id,
    account?.email,
    account?.firstName,
    account?.lastName,
    account?.position,
    setLoading,
  ]);

  const startTyping = useCallback(
    (conversationId: string) => {
      if (!socketRef.current || connectionStatus !== "connected" || !account?._id) {
        return;
      }
      const userName = [account?.firstName, account?.lastName].filter(Boolean).join(" ") || account?.email || "";
      socketRef.current.emit("typing:start", {
        conversationId,
        userId: account._id,
        userName,
      });
    },
    [connectionStatus, account?._id, account?.firstName, account?.lastName, account?.email]
  );

  const stopTyping = useCallback(
    (conversationId: string) => {
      if (!socketRef.current || connectionStatus !== "connected" || !account?._id) {
        return;
      }
      socketRef.current.emit("typing:stop", {
        conversationId,
        userId: account._id,
      });
    },
    [connectionStatus, account?._id]
  );

  return useMemo(
    () => ({
      messages,
      conversations,
      users,
      connectionStatus,
      addReaction,
      removeReaction,
      sendMessage,
      markAsRead,
      createConversation,
      attachedFile,
      registerAccount,
      loading,
      selectedConvo,
      setLoading,
      typingUsers,
      startTyping,
      stopTyping,
    }),
    [
      messages,
      conversations,
      users,
      connectionStatus,
      addReaction,
      removeReaction,
      sendMessage,
      markAsRead,
      createConversation,
      attachedFile,
      registerAccount,
      loading,
      selectedConvo,
      setLoading,
      typingUsers,
      startTyping,
      stopTyping,
    ]
  );
};
