import mongoose, { Schema, Document, Model } from "mongoose";

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId | string;
  senderId: string;
  senderName: string;
  content?: string;
  reactions?: MessageReaction[];
  attachments?: AttachedFile[];
  timestamp: Date;
  isOwn: string;
  isSeen?: boolean;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Conversation",
    },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: false },

    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: String, required: true }],
        count: { type: Number, default: 0 },
      },
    ],

    attachments: [
      {
        name: { type: String, required: true },
        size: { type: Number, required: true },
        type: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],

    timestamp: { type: Date, default: Date.now },
    isOwn: { type: String, required: true },
    isSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export { Message, MessageSchema };
