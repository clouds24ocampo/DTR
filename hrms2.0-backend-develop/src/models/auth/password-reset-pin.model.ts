import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPasswordResetPin extends Document {
  email: string;
  pin: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const PasswordResetPinSchema = new Schema<IPasswordResetPin>(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    pin: {
      type: String,
      required: true,
      length: 6,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
PasswordResetPinSchema.index({ email: 1, verified: 1, expiresAt: 1 });

// TTL index to auto-delete expired documents
PasswordResetPinSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetPin: Model<IPasswordResetPin> =
  mongoose.models.PasswordResetPin ||
  mongoose.model<IPasswordResetPin>("PasswordResetPin", PasswordResetPinSchema);

export default PasswordResetPin;

