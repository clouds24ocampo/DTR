import mongoose, { Document, Schema } from "mongoose";
import {
  IWorkplace,
  WorkplaceAssignedUser,
  WorkplaceStationDay,
  Workstation,
} from "../../types/workforce/workplace/workplace.type";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One user assigned to this workstation on a given date (shift label + times). */
const AssignmentSchema = new Schema<WorkplaceAssignedUser>(
  {
    userId: { type: String, required: true },
    label: { type: String, required: false },
    scheduledStartTime: { type: String, required: true, match: HHMM },
    scheduledEndTime: { type: String, required: true, match: HHMM },
    startMealTime: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * One date on this workstation with its assigned users.
 * Populated when users are assigned (manual or automatic scheduling) so Workplace
 * Management can preview which dates have assignments and who is assigned.
 */
const StationDaySchema = new Schema<WorkplaceStationDay>(
  {
    date: { type: String, required: true },
    assignedUsers: { type: [AssignmentSchema], default: [] },
  },
  { _id: false }
);

/** Workstation: name + list of dates, each with assignedUsers for that date. */
const WorkstationSchema = new Schema<Workstation>({
  stationName: { type: String, required: true, trim: true },
  dates: { type: [StationDaySchema], default: [] },
});

const WorkplaceSchema = new Schema<IWorkplace>(
  {
    name: { type: String, required: true, unique: true },
    workstationCount: { type: Number, required: true, min: 1 },
    workstations: { type: [WorkstationSchema], default: [] },
  },
  { timestamps: true }
);

WorkplaceSchema.pre("validate", function (next) {
  const doc = this as IWorkplace & Document;

  if (
    (!doc.workstations || doc.workstations.length === 0) &&
    doc.workstationCount > 0
  ) {
    doc.workstations = Array.from({ length: doc.workstationCount }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      stationName: `Station ${i + 1}`,
      dates: [],
    })) as any;
  }
  next();
});

export default mongoose.model<IWorkplace>("Workplace", WorkplaceSchema);
