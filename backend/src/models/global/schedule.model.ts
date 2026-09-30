import mongoose, { Schema } from "mongoose";
import {
  IFullSched,
  ISchedule,
  ISession,
} from "../../types/global/schedule/schedule.type";

const FullSchedSchema = new Schema<IFullSched>({
  type: { type: String, enum: ["work", "break", "meal"], required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
});

const SessionSchema = new Schema<ISession>({
  label: { type: String, required: true },
  workCredits: { type: String, required: true },
  breakCredits: { type: String, required: true },
  breakCount: { type: Number, required: true },
  mealCredits: { type: String, required: true },
  mealCount: { type: Number, required: true },
  scheduledStartTime: { type: String, required: true },
  scheduledEndTime: { type: String, required: true },
  startMealTime: { type: [String] },
  fullSched: [FullSchedSchema],
});

const ScheduleSchema = new Schema<ISchedule>({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  teamName: { type: String },
  workstationId: { type: String },
  sessions: [SessionSchema],
});

ScheduleSchema.index({
  teamName: "text",
  workstationId: "text",
});

export default mongoose.model<ISchedule>("Schedule", ScheduleSchema);
