import { Conversation, MessengerUser } from "./messaging.types";

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface AttachedFile {
  _id?: string;
  name: string;
  size: number;
  type: string;
  url: string;
}
export interface MessageIo {
  _id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  reactions?: MessageReaction[];
  attachments?: AttachedFile[];
  isOwn: string;
  isSeen?: boolean;
  createdAt: string;
}

import { INotification } from "../notification/notification.types";
import { DTRDocLite } from "../dtr/dtr.type";

export interface ServerToClientEvents {
  "message:new": (payload: MessageIo) => void;
  "message:reaction": (payload: MessageIo) => void;
  "message:seen": (payload: MessageIo) => void;
  "convo:last-message": (payload: Conversation) => void;
  "conversation:new": (payload: Conversation) => void;
  "account:new": (payload: MessengerUser) => void;
  "typing:start": (payload: { conversationId: string; userId: string; userName: string }) => void;
  "typing:stop": (payload: { conversationId: string; userId: string }) => void;
  "notification:new": (payload: INotification) => void;
  "notification:update": (payload: INotification) => void;
  "notification:unread-count": (payload: { count: number }) => void;
  "dtr:update": (payload: { dtr: DTRDocLite }) => void;
  ready: () => void;
}
export interface ClientToServerEvents {
  auth: (payload: { userId: string }) => void;
  "typing:start": (payload: { conversationId: string; userId: string; userName: string }) => void;
  "typing:stop": (payload: { conversationId: string; userId: string }) => void;
  "message:mark-seen": (payload: { messageId: string; conversationId: string }) => void;
}
