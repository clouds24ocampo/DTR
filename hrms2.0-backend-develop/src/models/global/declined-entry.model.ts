import mongoose, { type Document, Schema } from "mongoose";
import type {
  DeclinedEntryDocLite,
  DeclinedActionType,
  DeclinedEntryCoordinates,
  DeclinedEntryScheduleInfo,
  DeclinedEntryEmployeeInfo,
} from "src/types/global/declined-entry/declined-entry.type";

export interface IDeclinedEntry extends Document {
  userId: string;
  date: string;
  actionType: DeclinedActionType;
  coordinates: DeclinedEntryCoordinates;
  timestamp: Date;
  scheduleInfo?: DeclinedEntryScheduleInfo;
  employeeInfo?: DeclinedEntryEmployeeInfo;
}

/* ------------------------------ Sub-schemas ------------------------------ */

const CoordinatesSchema = new Schema<DeclinedEntryCoordinates>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const ScheduleInfoSchema = new Schema<DeclinedEntryScheduleInfo>(
  {
    scheduledStartTime: { type: String },
    scheduledEndTime: { type: String },
  },
  { _id: false }
);

const EmployeeInfoSchema = new Schema<DeclinedEntryEmployeeInfo>(
  {
    idNumber: { type: String },
    name: { type: String },
    position: { type: String },
    profilePicture: { type: String },
  },
  { _id: false }
);

/* --------------------------------- Model --------------------------------- */

const DeclinedEntrySchema = new Schema<IDeclinedEntry>(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    actionType: {
      type: String,
      enum: [
        "work",
        "break",
        "meal",
        "bio-break",
        "clinic-break",
        "system-issue",
        "timeout",
      ],
      required: true,
    },
    coordinates: { type: CoordinatesSchema, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    scheduleInfo: { type: ScheduleInfoSchema },
    employeeInfo: { type: EmployeeInfoSchema },
  },
  { timestamps: true }
);

DeclinedEntrySchema.index({ userId: 1, date: 1 });
DeclinedEntrySchema.index({ timestamp: -1 });

const DeclinedEntry =
  (mongoose.models.DeclinedEntry as mongoose.Model<IDeclinedEntry>) ||
  mongoose.model<IDeclinedEntry>("DeclinedEntry", DeclinedEntrySchema);

export default DeclinedEntry;
export type { DeclinedEntryDocLite };

