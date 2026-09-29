import { Message } from "../../types/global/messaging/socket.types";

export const MessageIo = (mes: any): Message => ({
  _id: String(mes._id),
  conversationId: mes.conversationId,
  senderId: mes.senderId,
  senderName: mes.senderName,
  content: String(mes.content),
  timestamp: mes.timestamp,
  isOwn: mes.isOwn,
  isSeen: mes.isSeen || false,
  createdAt: new Date(mes.createdAt).toISOString(),
});

export const parseBool = (v: unknown): boolean | undefined => {
  if (v === undefined) return undefined;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return undefined;
};