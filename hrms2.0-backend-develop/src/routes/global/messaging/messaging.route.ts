import express from "express";
import { createTestAccount } from "nodemailer";
import {
  addReaction,
  attachFiles,
  createAccount,
  createConversation,
  createMessage,
  getConversations,
  getMessages,
  getUser,
  markMessageAsSeen,
  markConversationAsRead,
  removeReaction,
} from "src/controllers/global/messaging/messaging.controller";

const router = express.Router();

router.get("/all-user", getUser);
router.get("/all-conversations", getConversations);
router.get("/all-messages", getMessages);

router.post("/create-account/:id", createAccount);
router.post("/create-conversation", createConversation);
router.post("/create-message", createMessage);
router.post("/attach-files/:id", attachFiles)

router.put("/reaction-emoji", addReaction);
router.put("/remove-reaction", removeReaction);
router.put("/mark-seen", markMessageAsSeen);
router.put("/mark-conversation-read", markConversationAsRead);

export default router;
