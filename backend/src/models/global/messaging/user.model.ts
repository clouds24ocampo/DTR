import mongoose, { Document, Schema, Model } from "mongoose";

export interface IMessengerUser extends Document<string> {
  _id: string;
  name: string;
  email: string;
  position: string;
  avatar: string;
  messengerId: string;
  isOnline: boolean;
}

const MessengerUserSchema = new Schema<IMessengerUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    position: { type: String, required: true, trim: true },
    avatar: { type: String, required: true, trim: true },
    messengerId: { type: String, required: true, unique: true, trim: true },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const MessengerUser: Model<IMessengerUser> =
  mongoose.models.MessengerUser ||
  mongoose.model<IMessengerUser>("MessengerUser", MessengerUserSchema);

export default MessengerUser;
