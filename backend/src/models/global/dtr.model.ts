import mongoose, { type Document, Schema } from "mongoose";
import type { DTRSessionComputed, IFullDTR } from "src/types/global/dtr/dtr.type";

export interface IDTR extends Document {
  userId: string;
  date: string;
  sessions: DTRSessionComputed[];
}

/* ------------------------------ Sub-schemas ------------------------------ */

const FullDTRSchema = new Schema<IFullDTR>(
  {
    type: {
      type: String,
      enum: [
        "work",
        "break",
        "meal",
        "bio-break",
        "system issue",
        "clinic break",
        "on trip",
      ],
      required: true,
    },
    startTime: {
      type: String,
      required: function (this: any) {
        return this.status !== "skipped";
      },
    },
    startTag: {
      type: String,
      default: "--",
      required: function (this: any) {
        return this.status !== "skipped";
      },
    },
    endTime: { type: String },
    endTag: { type: String, default: "--" },
    issue: {
      type: String,
      enum: ["hardware", "software"],
    },
    reason: { type: String },
    tripType: { type: String },
    tripReason: { type: String },
    tripCategory: { type: String, enum: ["Whole day", "Half day"] },
    halfDayType: { type: String, enum: ["Morning", "Afternoon"] },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },
    duration: { type: String, default: "00:00" },
    status: {
      type: String,
      enum: ["active", "done", "skipped"],
      required: true,
    },
  },
  { _id: false }
);

const DTRSessionSchema = new Schema<DTRSessionComputed>(
  {
    label: { type: String, required: true },
    workCredits: { type: String, required: true },
    breakCredits: { type: String, required: true },
    breakCount: { type: Number, required: true, default: 0 },
    mealCredits: { type: String, required: true },
    mealCount: { type: Number, required: true, default: 0 },

    DTRTotalWork: { type: String, required: true, default: "00:00" },
    DTRTotalBreak: { type: String, required: true, default: "00:00" },
    DTRTotalMeal: { type: String, required: true, default: "00:00" },

    scheduledStartTime: { type: String, required: true },
    scheduledEndTime: { type: String, required: true },
    startMealTime: { type: String, required: true },

    fullDTR: { type: [FullDTRSchema], default: [] },
  },
  { _id: false }
);

/* --------------------------------- Model --------------------------------- */

const DTRSchema = new Schema<IDTR>({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  sessions: { type: [DTRSessionSchema], default: [] },
});

DTRSchema.index({ userId: 1, date: 1 }, { unique: true });

const DTR =
  (mongoose.models.DTR as mongoose.Model<IDTR>) ||
  mongoose.model<IDTR>("DTR", DTRSchema);

export default DTR;
export type { DTRSessionComputed, IFullDTR };
