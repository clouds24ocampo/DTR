import mongoose, { Schema, Document, Model } from "mongoose";

export type FreedomWallNotifyKind = "reaction" | "comment";

export interface IFreedomWallNotification {
  userId: string;
  kind: FreedomWallNotifyKind;
  postId: string;
  postExcerpt: string;
  /** reaction only */
  reactionType?: string;
  /** comment only */
  commentExcerpt?: string;
  authorDisplayName?: string;
  createdAt: Date;
}

export interface IFreedomWallNotificationDocument extends IFreedomWallNotification, Document {}

const FreedomWallNotificationSchema = new Schema<IFreedomWallNotificationDocument>(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, enum: ["reaction", "comment"], required: true },
    postId: { type: String, required: true },
    postExcerpt: { type: String, default: "" },
    reactionType: { type: String },
    commentExcerpt: { type: String },
    authorDisplayName: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "freedom_wall_notifications" }
);

FreedomWallNotificationSchema.index({ userId: 1, createdAt: -1 });

export const FreedomWallNotification: Model<IFreedomWallNotificationDocument> =
  mongoose.models.FreedomWallNotification ||
  mongoose.model<IFreedomWallNotificationDocument>(
    "FreedomWallNotification",
    FreedomWallNotificationSchema
  );
