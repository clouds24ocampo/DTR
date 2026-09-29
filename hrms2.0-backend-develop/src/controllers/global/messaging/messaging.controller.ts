import { Request, Response } from "express";
import { Conversation } from "../../../models/global/messaging/conversation.model";
import { Message } from "../../../models/global/messaging/message.model";
import MessengerUser from "../../../models/global/messaging/user.model";
import { io } from "../../../index";
import { MessageIo } from "../../../utils/global/message";

//-------------------------------------------------------[User]
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await MessengerUser.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const createAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, position, avatar, messengerId, isOnline } = req.body;
    console.log("Creating account for messengerId:", messengerId);
    const { id } = req.params;
    const document = new MessengerUser({
      name,
      email,
      position,
      avatar,
      isOnline,
      messengerId,
    });
    await document.save();
    io.to(`user:${id}`).emit("account:new", document);
    res.status(201).json(document);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        message:
          "Duplicate document. A document with the same unique field already exists.",
        error: error.message,
      });
      return;
    }
    res.status(400).json({ message: "Validation error", error: error.message });
  }
};

//-------------------------------------------------------[Conversation]
export const getConversations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const conversations = await Conversation.find();
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const createConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      lastMessage,
      timestamp,
      unread,
      avatar,
      isOnline,
      participants,
    } = req.body;
    const conversation = new Conversation({
      name,
      lastMessage,
      timestamp,
      avatar,
      participants,
      unread,
      isOnline,
    });
    await conversation.save();
    const conversationObject = conversation.toObject();
    const participantsList: string[] = conversation.participants || [];
    const createdBy = req.body.createdBy != null ? String(req.body.createdBy) : undefined;
    participantsList.forEach((participantId) => {
      if (createdBy && String(participantId) === createdBy) return;
      io.to(`user:${participantId}`).emit("conversation:new", conversationObject);
    });
    res.status(201).json(conversation);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        message:
          "Duplicate document. A document with the same unique field already exists.",
        error: error.message,
      });
      return;
    }
    res.status(400).json({ message: "Validation error", error: error.message });
  }
};

//-------------------------------------------------------[Messsage]
export const getMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const query = conversationId ? { conversationId } : {};
    const messages = await Message.find(query).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const createMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId, senderId, senderName, content, timestamp, isOwn } =
      req.body;

    if (!conversationId || !senderId || !senderName || !content) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const message = new Message({
      conversationId,
      senderId,
      senderName,
      content,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      isOwn,
    });

    await message.save();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found." });
      return;
    }

    // Update last message info
    conversation.lastMessage = content;
    conversation.senderId = senderId;
    conversation.timestamp = timestamp;

    // Increment unread count only for the recipient (not the sender)
    // The unread count represents messages unread by the recipient
    const participants: string[] = conversation.participants || [];
    const recipientId = participants.find((p) => p !== senderId);
    
    if (recipientId) {
      // Only increment unread if there's a recipient (not a self-message)
      conversation.unread = (conversation.unread || 0) + 1;
    }

    await conversation.save();

    const participantsList: string[] = conversation.participants || [];
    const formattedMessage = MessageIo(message.toObject());
    const updatedConversation = conversation.toObject();

    console.log("Broadcasting message to participants:", participantsList);

    participantsList.forEach((userId) => {
      io.to(`user:${userId}`).emit("message:new", formattedMessage);
      io.to(`user:${userId}`).emit("convo:last-message", updatedConversation);
    });

    res.status(201).json({
      message: "Message created and broadcasted successfully.",
      document: message,
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Server error", error: err.message || err });
  }
};

export const addReaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messageId, emoji, userId, conversationId } = req.body;

    if (!messageId || !emoji || !userId || !conversationId) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found." });
      return;
    }

    const reactionIndex =
      message.reactions?.findIndex((r) => r.emoji === emoji) ?? -1;

    if (reactionIndex > -1) {
      const reaction = message.reactions![reactionIndex];
      if (!reaction.users.includes(userId)) {
        reaction.users.push(userId);
        reaction.count = reaction.users.length;
      }
    } else {
      message.reactions?.push({
        emoji,
        users: [userId],
        count: 1,
      });
    }

    await message.save();

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found." });
      return;
    }

    const participants: string[] = conversation.participants || [];
    const populatedMessage = await Message.findById(message._id).lean();

    participants.forEach((participantId) => {
      io.to(`user:${participantId}`).emit("message:reaction", populatedMessage);
    });

    res.status(201).json({
      message: "Reaction added and broadcasted successfully.",
      document: populatedMessage,
    });
  } catch (err: any) {
    console.error("Error in addReaction:", err);
    res
      .status(500)
      .json({ message: "Server error", error: err.message || err });
  }
};

export const removeReaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messageId, emoji, userId, conversationId } = req.body;

    if (!messageId || !emoji || !userId || !conversationId) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found." });
      return;
    }

    const reactionIndex =
      message.reactions?.findIndex((r) => r.emoji === emoji) ?? -1;

    if (reactionIndex > -1 && message.reactions?.[reactionIndex]) {
      const reaction = message.reactions[reactionIndex];
      reaction.users = reaction.users.filter((id) => id !== userId);
      reaction.count = reaction.users.length;
      if (reaction.count === 0) {
        message.reactions.splice(reactionIndex, 1);
      }
    }

    await message.save();

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found." });
      return;
    }

    const participants: string[] = conversation.participants || [];
    const populatedMessage = await Message.findById(message._id).lean();

    participants.forEach((participantId) => {
      io.to(`user:${participantId}`).emit("message:reaction", populatedMessage);
    });

    res.status(200).json({
      message: "Reaction removed and broadcasted successfully.",
      document: populatedMessage,
    });
  } catch (err: any) {
    console.error("Error in removeReaction:", err);
    res
      .status(500)
      .json({ message: "Server error", error: err.message || err });
  }
};

export const attachFiles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { files, payload } = req.body;
    const { id } = req.params;

    if (!files || files.length === 0) {
      res.status(400).json({ message: "No files provided." });
      return;
    }

    const message = new Message({
      conversationId: id,
      senderId: payload.senderId,
      senderName: payload.senderName,
      content: "",
      attachments: files,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      isOwn: payload.isOwn,
    });

    await message.save();

    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found." });
      return;
    }

    const participants: string[] = conversation.participants || [];
    const formattedMessage = {
      ...message.toObject(),
      conversationId: message.conversationId.toString(),
    };

    participants.forEach((participantId) => {
      io.to(`user:${participantId}`).emit("message:new", formattedMessage);
    });

    res.status(201).json({
      message: "File(s) attached and broadcasted successfully.",
      document: formattedMessage,
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Server error", error: err.message || err });
  }
};

export const markMessageAsSeen = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messageId, conversationId } = req.body;

    if (!messageId || !conversationId) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found." });
      return;
    }

    // Only mark as seen if not already seen
    if (!message.isSeen) {
      message.isSeen = true;
      await message.save();

      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        res.status(404).json({ message: "Conversation not found." });
        return;
      }

      const participants: string[] = conversation.participants || [];
      const formattedMessage = MessageIo(message.toObject());

      // Broadcast the seen status to all participants
      participants.forEach((userId) => {
        io.to(`user:${userId}`).emit("message:seen", formattedMessage);
      });

      res.status(200).json({
        message: "Message marked as seen successfully.",
        document: formattedMessage,
      });
    } else {
      res.status(200).json({
        message: "Message already marked as seen.",
        document: MessageIo(message.toObject()),
      });
    }
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Server error", error: err.message || err });
  }
};

export const markConversationAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found." });
      return;
    }

    // Reset unread count to 0
    conversation.unread = 0;
    await conversation.save();

    const participants: string[] = conversation.participants || [];
    const unreadFilter = {
      conversationId,
      senderId: { $ne: userId },
      isSeen: false,
    };

    // Find messages we're about to mark as seen so we can emit message:seen to sender(s)
    const messagesToMark = await Message.find(unreadFilter).lean();
    await Message.updateMany(unreadFilter, { isSeen: true });

    // Emit message:seen for each updated message so the sender sees "seen" (e.g. when recipient opened chat from another page or list preview)
    messagesToMark.forEach((msg) => {
      const formatted = MessageIo(msg);
      participants.forEach((participantId) => {
        io.to(`user:${participantId}`).emit("message:seen", formatted);
      });
    });

    const updatedConversation = conversation.toObject();

    // Broadcast the updated conversation to all participants
    participants.forEach((participantId) => {
      io.to(`user:${participantId}`).emit("convo:last-message", updatedConversation);
    });

    res.status(200).json({
      message: "Conversation marked as read successfully.",
      document: updatedConversation,
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Server error", error: err.message || err });
  }
};