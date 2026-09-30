import { Request } from "express";
import { io } from "../../../index";
import { MessageIo } from "../../../utils/global/message";
import { asyncHandler } from "../../../utils/global/error";
import * as messaging from "../../../services/global/messaging/messaging.service";

// Identity always comes from the verified JWT (protectRoute), never the request body.
const me = (req: Request): string => String((req as Request & { account?: { _id: unknown } }).account?._id ?? "");

const emit = (userIds: string[], event: string, payload: unknown) =>
  userIds.forEach((id) => io.to(`user:${id}`).emit(event, payload));

export const getUser = asyncHandler(async (_req, res) => {
  res.status(200).json(await messaging.listUsers());
});

export const createAccount = asyncHandler(async (req, res) => {
  const document = await messaging.createAccount(me(req), req.params.id, req.body);
  emit([req.params.id], "account:new", document);
  res.status(201).json(document);
});

export const getConversations = asyncHandler(async (req, res) => {
  res.status(200).json(await messaging.listConversations(me(req)));
});

export const createConversation = asyncHandler(async (req, res) => {
  const conversation = await messaging.createConversation(me(req), req.body);
  const others = conversation.participants.map(String).filter((p) => p !== me(req));
  emit(others, "conversation:new", conversation.toObject());
  res.status(201).json(conversation);
});

export const getMessages = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId ?? req.query.conversationId;
  res.status(200).json(await messaging.listMessages(me(req), conversationId));
});

export const createMessage = asyncHandler(async (req, res) => {
  const { message, conversation, participants } = await messaging.createMessage(me(req), req.body);
  emit(participants, "message:new", MessageIo(message.toObject()));
  emit(participants, "convo:last-message", conversation.toObject());
  res.status(201).json({ message: "Message created and broadcasted successfully.", document: message });
});

const reaction = (add: boolean) =>
  asyncHandler(async (req, res) => {
    const { message, participants } = await messaging.react(me(req), req.body, add);
    emit(participants, "message:reaction", message);
    res.status(add ? 201 : 200).json({
      message: `Reaction ${add ? "added" : "removed"} and broadcasted successfully.`,
      document: message,
    });
  });
export const addReaction = reaction(true);
export const removeReaction = reaction(false);

export const attachFiles = asyncHandler(async (req, res) => {
  const { message, participants } = await messaging.attachFiles(me(req), req.params.id, req.body);
  const formatted = { ...message.toObject(), conversationId: message.conversationId.toString() };
  emit(participants, "message:new", formatted);
  res.status(201).json({ message: "File(s) attached and broadcasted successfully.", document: formatted });
});

export const markMessageAsSeen = asyncHandler(async (req, res) => {
  const { message, changed, participants } = await messaging.markSeen(me(req), req.body);
  const formatted = MessageIo(message.toObject());
  if (changed) emit(participants, "message:seen", formatted);
  res.status(200).json({
    message: changed ? "Message marked as seen successfully." : "Message already marked as seen.",
    document: formatted,
  });
});

export const markConversationAsRead = asyncHandler(async (req, res) => {
  const { conversation, seen, participants } = await messaging.markConversationRead(
    me(req),
    req.body.conversationId
  );
  seen.forEach((m) => emit(participants, "message:seen", MessageIo(m)));
  const updated = conversation.toObject();
  emit(participants, "convo:last-message", updated);
  res.status(200).json({ message: "Conversation marked as read successfully.", document: updated });
});
