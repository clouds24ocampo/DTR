import mongoose, { Document, Schema } from "mongoose";

export interface IEvent extends Document {
  date: Date | string;
  time: string;
  title: string;
  details?: string;
  status: "Pending" | "Confirmed" | "Completed" | "Canceled" | string;
  color: string;
  createdBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    date: {
      type: Schema.Types.Mixed,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Canceled"],
      default: "Pending",
    },
    color: {
      type: String,
      default: "yellow",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const EventModel = mongoose.model<IEvent>("Event", EventSchema);
export default EventModel;
