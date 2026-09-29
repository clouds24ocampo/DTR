/* ------------------------------ unions only ------------------------------ */

export type DTRType =
  | "work"
  | "break"
  | "meal"
  | "bio-break"
  | "system issue"
  | "clinic break"
  | "on trip";

export type DTRStatus = "active" | "done";
export type IssueType = "hardware" | "software";

/* ---------------------------- DTOs / shapes ----------------------------- */
/** Use `type` aliases only (no interfaces), kept in sync with the model. */

export type IFullDTR = {
  type: DTRType;
  startTime: string; // "HH:mm"
  startTag: string; // e.g. "good" | "late" | "--"
  endTime?: string; // "HH:mm"
  endTag?: string; // e.g. "overtime" | "undertime" | "--"
  issue?: IssueType; // when type === "system issue"
  reason?: string; // when system issue / clinic break
  tripType?: string; // when type === "on trip"
  tripReason?: string; // when type === "on trip"
  tripCategory?: "Whole day" | "Half day";
  halfDayType?: "First session" | "Second session";
  approvalStatus?: "pending" | "approved" | "rejected";
  duration: string; // "HH:mm"
  status: DTRStatus; // "active" | "done"
};

export type DTRSessionComputed = {
  label: string; // NEW: required label carried from schedule
  workCredits: string;
  breakCredits: string;
  breakCount: number;
  mealCredits: string;
  mealCount: number;

  DTRTotalWork: string;
  DTRTotalBreak: string;
  DTRTotalMeal: string;

  scheduledStartTime: string;
  scheduledEndTime: string;
  startMealTime: string; // DTR side uses a single anchor

  fullDTR: IFullDTR[];
};

export type DTRDocLite = {
  _id?: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  sessions: DTRSessionComputed[];
};

/* ------------------------------ schedule glue --------------------------- */

export type ScheduleBlockType = "work" | "break" | "meal";

export type ScheduleBlock = {
  type: ScheduleBlockType;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
};

export type NormalizedScheduleSession = {
  label: string; // NEW: ensure label flows from schedule → DTR
  workCredits: string;
  breakCredits: string;
  breakCount: number;
  mealCredits: string;
  mealCount: number;
  scheduledStartTime: string;
  scheduledEndTime: string;
  fullSched?: ScheduleBlock[];
  startMealTime?: string[]; // schedule-side may carry multiple anchors
};

export type ScheduleDocLite = {
  userId: string;
  date: string; // "YYYY-MM-DD"
  sessions: NormalizedScheduleSession[];
};

/* ------------------------------ request bodies --------------------------- */

export type CreateDTRBodyInput = {
  userId?: string;
  date?: string; // "YYYY-MM-DD"
};

export type StartDTRItemBodyInput = {
  userId?: string;
  type?: DTRType;
  issue?: IssueType; // only when type === "system issue"
  reason?: string; // for "system issue" or "clinic break"
  tripType?: string; // only when type === "on trip"
  tripReason?: string; // only when type === "on trip"
  tripCategory?: "Whole day" | "Half day";
  halfDayType?: "First session" | "Second session";
  date?: string; // "YYYY-MM-DD"
};

export type EndDTRItemBodyInput = {
  userId?: string;
  date?: string; // "YYYY-MM-DD"
  isSystemTimeout?: boolean;
};

/* compatibility alias for existing imports */
export type StartableType = DTRType;
