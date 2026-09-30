export type DTRType =
  | "work"
  | "break"
  | "meal"
  | "bio-break"
  | "system issue"
  | "clinic break"
  | "on trip";

export type DTRStatus = "active" | "done" | "skipped";
export type IssueType = "hardware" | "software";

export type IFullDTR =
  | {
    type: DTRType;
    status: "active" | "done";
    startTime: string;
    startTag: string;
    endTime?: string;
    endTag?: string;
    issue?: IssueType;
    reason?: string;
    tripType?: string;
    tripReason?: string;
    tripCategory?: "Whole day" | "Half day";
    halfDayType?: "Morning" | "Afternoon";
    approvalStatus?: "pending" | "approved" | "rejected";
    duration: string;
  }
  | {
    type: DTRType;
    status: "skipped";
    startTime?: string;
    startTag?: string;
    endTime?: string;
    endTag?: string;
    issue?: IssueType;
    reason?: string;
    tripType?: string;
    tripReason?: string;
    tripCategory?: "Whole day" | "Half day";
    halfDayType?: "Morning" | "Afternoon";
    approvalStatus?: "pending" | "approved" | "rejected";
    duration?: string;
  };

export type DTRSessionComputed = {
  label: string;
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
  startMealTime: string;

  fullDTR: IFullDTR[];
};

export type DTRDocLite = {
  _id?: string;
  userId: string;
  date: string;
  sessions: DTRSessionComputed[];
};

export type ScheduleBlockType = "work" | "break" | "meal";

export type ScheduleBlock = {
  type: ScheduleBlockType;
  start: string;
  end: string;
};

export type NormalizedScheduleSession = {
  label: string;
  workCredits: string;
  breakCredits: string;
  breakCount: number;
  mealCredits: string;
  mealCount: number;
  scheduledStartTime: string;
  scheduledEndTime: string;
  fullSched?: ScheduleBlock[];
  startMealTime?: string[];
};

export type ScheduleDocLite = {
  userId: string;
  date: string;
  sessions: NormalizedScheduleSession[];
};

export type CreateDTRBodyInput = {
  userId?: string;
  date?: string;
};

export type StartDTRItemBodyInput = {
  userId?: string;
  type?: DTRType;
  issue?: IssueType;
  reason?: string;
  tripType?: string;
  tripReason?: string;
  tripCategory?: "Whole day" | "Half day";
  halfDayType?: "Morning" | "Afternoon";
  date?: string;
};

export type EndDTRItemBodyInput = {
  userId?: string;
  date?: string;
  isSystemTimeout?: boolean;
};

export type StartableType = DTRType;

export type SessionTimingLike = {
  startMealTime: string;
  scheduledEndTime: string;
  breakCredits: string;
  mealCredits: string;
};
