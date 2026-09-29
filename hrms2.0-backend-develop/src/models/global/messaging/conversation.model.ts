import mongoose, { Schema, Model, Document } from "mongoose";

export interface IConversation extends Document {
  _id: string;
  name: string;
  lastMessage?: string;
  senderId?: string;
  timestamp?: string;
  unread: number;
  avatar: string;
  participants: string[];
  isOnline: boolean;
}

const ConversationSchema = new Schema<IConversation>(
  {
    name: { type: String, required: true, trim: true },
    lastMessage: { type: String },
    senderId: { type: String },
    timestamp: { type: String },
    unread: { type: Number, default: 0 },
    avatar: { type: String, required: true, trim: true },
    participants: { type: [String], required: true },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export { Conversation, ConversationSchema };
