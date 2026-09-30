import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import {
  Conversation,
  MessengerUser,
} from "../../../types/global/messaging/messaging.types";
import { MessageIo } from "../../../types/global/messaging/messageio.types";

type Updater<T> = T | ((prev: T) => T);

interface MessagingState {
  messages: Record<string, MessageIo[]>;
  conversations: Conversation[];
  users: MessengerUser[];
  selectedConvo: string;
  loading: boolean;

  setMessages: (value: Updater<Record<string, MessageIo[]>>) => void;
  setConversations: (value: Updater<Conversation[]>) => void;
  setUsers: (value: Updater<MessengerUser[]>) => void;
  setSelectedConvo: (value: Updater<string>) => void;
  setLoading: (value: boolean) => void;

  appendMessage: (
    conversationId: string,
    newMessages: MessageIo | MessageIo[]
  ) => void;

  updateMessageReactions: (
    conversationId: string,
    messageId: string,
    reactions: MessageIo["reactions"]
  ) => void;

  reset: () => void;
}

const resolveValue = <T>(updater: Updater<T>, prev: T): T =>
  typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;

const useMessagingStore = create<MessagingState>()(
  devtools(
    persist(
      (set) => ({
        messages: {},
        conversations: [],
        users: [],
        selectedConvo: "",
        loading: false,

        setMessages: (value) =>
          set((state) => ({ messages: resolveValue(value, state.messages) })),

        setConversations: (value) =>
          set((state) => ({
            conversations: resolveValue(value, state.conversations),
          })),

        setUsers: (value) =>
          set((state) => ({ users: resolveValue(value, state.users) })),

        setSelectedConvo: (value) =>
          set((state) => ({
            selectedConvo: resolveValue(value, state.selectedConvo),
          })),

        setLoading: (value) => set({ loading: value }),

        appendMessage: (conversationId, newMessages) =>
          set((state) => {
            const existing = state.messages[conversationId] ?? [];
            const msgs = Array.isArray(newMessages)
              ? newMessages
              : [newMessages];
            return {
              messages: {
                ...state.messages,
                [conversationId]: [...existing, ...msgs],
              },
            };
          }),

        updateMessageReactions: (conversationId, messageId, reactions) =>
          set((state) => {
            const existing = state.messages[conversationId];
            if (!existing) return {};
            const updated = existing.map((msg) =>
              msg._id === messageId ? { ...msg, reactions } : msg
            );
            return {
              messages: { ...state.messages, [conversationId]: updated },
            };
          }),

        reset: () =>
          set({
            messages: {},
            conversations: [],
            users: [],
            selectedConvo: "",
            loading: false,
          }),
      }),
      {
        name: "messaging-store",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          messages: state.messages,
          conversations: state.conversations,
          selectedConvo: state.selectedConvo,
          users: state.users,
        }),
      }
    )
  )
);

export default useMessagingStore;
