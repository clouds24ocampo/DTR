import mongoose from "mongoose";
import { Conversation, IConversation } from "../../../models/global/messaging/conversation.model";
import { Message } from "../../../models/global/messaging/message.model";
import MessengerUser from "../../../models/global/messaging/user.model";
import { ServiceError } from "../../../utils/global/error";

/**
 * Messaging business logic. Every operation takes the authenticated user's id
 * and enforces that they are a participant of the conversation.
 */

const participantsOf = (c: { participants?: string[] }): string[] =>
  (c.participants ?? []).map(String);

const notFound = () => new ServiceError("Conversation not found.", 404);

export const requireConversation = async (conversationId: unknown, userId: string) => {
  if (!mongoose.isValidObjectId(conversationId)) throw notFound();
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !participantsOf(conversation).includes(userId)) throw notFound();
  return conversation;
};

export const listUsers = () => MessengerUser.find();

export const createAccount = async (
  userId: string,
  targetId: string,
  data: Record<string, unknown>
) => {
  if (targetId !== userId) throw new ServiceError("Forbidden.", 403);
  const { name, email, position, avatar, messengerId, isOnline } = data;
  return new MessengerUser({ name, email, position, avatar, isOnline, messengerId }).save();
};

export const listConversations = (userId: string) =>
  Conversation.find({ participants: userId });

export const createConversation = async (userId: string, data: Partial<IConversation>) => {
  const { name, lastMessage, timestamp, unread, avatar, isOnline, participants } = data;
  if (!Array.isArray(participants) || !participants.map(String).includes(userId)) {
    throw new ServiceError("You must be a participant.", 403);
  }
  return new Conversation({
    name, lastMessage, timestamp, avatar, participants, unread, isOnline,
  }).save();
};

export const listMessages = async (userId: string, conversationId?: unknown) => {
  let ids: unknown[];
  if (conversationId) {
    ids = [(await requireConversation(conversationId, userId))._id];
  } else {
    const mine = await Conversation.find({ participants: userId }).select("_id").lean();
    ids = mine.map((c) => c._id);
  }
  return Message.find({ conversationId: { $in: ids } }).sort({ createdAt: 1 });
};

export const createMessage = async (
  userId: string,
  data: { conversationId?: string; senderName?: string; content?: string; timestamp?: string; isOwn?: string }
) => {
  const { conversationId, senderName, content, timestamp, isOwn } = data;
  if (!conversationId || !senderName || !content) {
    throw new ServiceError("Missing required fields.", 400);
  }
  const conversation = await requireConversation(conversationId, userId);

  const message = await new Message({
    conversationId,
    senderId: userId,
    senderName,
    content,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    isOwn,
  }).save();

  conversation.lastMessage = content;
  conversation.senderId = userId;
  conversation.timestamp = timestamp;
  // Unread counts messages waiting for the recipient (not self-messages).
  if (participantsOf(conversation).some((p) => p !== userId)) {
    conversation.unread = (conversation.unread || 0) + 1;
  }
  await conversation.save();

  return { message, conversation, participants: participantsOf(conversation) };
};

const findMessage = async (messageId: unknown, conversationId: unknown) => {
  const message = await Message.findOne({ _id: messageId, conversationId });
  if (!message) throw new ServiceError("Message not found.", 404);
  return message;
};

export const react = async (
  userId: string,
  data: { messageId?: string; emoji?: string; conversationId?: string },
  add: boolean
) => {
  const { messageId, emoji, conversationId } = data;
  if (!messageId || !emoji || !conversationId) {
    throw new ServiceError("Missing required fields.", 400);
  }
  const conversation = await requireConversation(conversationId, userId);
  const message = await findMessage(messageId, conversationId);

  const reactions = message.reactions ?? [];
  const index = reactions.findIndex((r) => r.emoji === emoji);

  if (add) {
    if (index > -1) {
      const r = reactions[index];
      if (!r.users.includes(userId)) {
        r.users.push(userId);
        r.count = r.users.length;
      }
    } else {
      reactions.push({ emoji, users: [userId], count: 1 });
    }
  } else if (index > -1) {
    const r = reactions[index];
    r.users = r.users.filter((id) => id !== userId);
    r.count = r.users.length;
    if (r.count === 0) reactions.splice(index, 1);
  }
  message.reactions = reactions;
  await message.save();

  return {
    message: await Message.findById(message._id).lean(),
    participants: participantsOf(conversation),
  };
};

export const attachFiles = async (
  userId: string,
  conversationId: string,
  data: { files?: unknown; payload?: { senderName?: string; timestamp?: string; isOwn?: string } }
) => {
  const { files, payload = {} } = data;
  if (!Array.isArray(files) || files.length === 0) {
    throw new ServiceError("No files provided.", 400);
  }
  const conversation = await requireConversation(conversationId, userId);
  const message = await new Message({
    conversationId,
    senderId: userId,
    senderName: payload.senderName,
    content: "",
    attachments: files,
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    isOwn: payload.isOwn,
  }).save();

  return { message, participants: participantsOf(conversation) };
};

export const markSeen = async (
  userId: string,
  data: { messageId?: string; conversationId?: string }
) => {
  const { messageId, conversationId } = data;
  if (!messageId || !conversationId) throw new ServiceError("Missing required fields.", 400);
  const conversation = await requireConversation(conversationId, userId);
  const message = await findMessage(messageId, conversationId);

  const changed = !message.isSeen;
  if (changed) {
    message.isSeen = true;
    await message.save();
  }
  return { message, changed, participants: participantsOf(conversation) };
};

export const markConversationRead = async (userId: string, conversationId?: string) => {
  if (!conversationId) throw new ServiceError("Missing required fields.", 400);
  const conversation = await requireConversation(conversationId, userId);
  conversation.unread = 0;
  await conversation.save();

  const filter = { conversationId, senderId: { $ne: userId }, isSeen: false };
  const seen = await Message.find(filter).lean();
  await Message.updateMany(filter, { isSeen: true });

  return { conversation, seen, participants: participantsOf(conversation) };
};
