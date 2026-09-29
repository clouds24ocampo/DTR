export interface IFullSched {
  type: "work" | "break" | "meal";
  start: string; // "HH:mm" or ISO time string
  end: string; // "HH:mm" or ISO time string
}

export interface ISession {
  label: string; // NEW: required — user-provided label
  workCredits: string; // e.g. "08:00"
  breakCredits: string; // e.g. "00:15"
  breakCount: number;
  mealCredits: string; // e.g. "01:00"
  mealCount: number;
  scheduledStartTime: string; // "HH:mm"
  scheduledEndTime: string; // "HH:mm"
  startMealTime?: string[]; // optional multiple meal starts
  fullSched: IFullSched[];
}

export interface IEditHistoryEntry {
  timestamp: string; // ISO string
  editorId: string; // user _id who edited
  change: "create" | "update" | "delete";
  sessionId?: string; // which subdoc changed
  note?: string; // why you edited the schedule
  before?: Partial<ISession>; // snapshot before
  after?: Partial<ISession>; // snapshot after
}

export interface ISchedule {
  userId: string;
  date: string; // "YYYY-MM-DD"
  teamName?: string;
  workstationId?: string;
  sessions: ISession[];
  editHistory?: IEditHistoryEntry[];
}

/** Many endpoints return documents with an identifier even if your base model omits it */
export type IScheduleDoc = ISchedule & { _id: string };

/** Body for POST /create — (your original variant) */
export type CreateSchedulesBodyInput = {
  date: string; // "YYYY-MM-DD"
  assignments: Array<
    Pick<ISchedule, "userId" | "teamName" | "workstationId" | "sessions">
  >;
};

/** Body for POST /filtered — filter by user and date (or by date range) */
export type GetSchedulesByUserAndDateBodyInput = {
  userId?: string; // if omitted, returns all users
  date?: string; // "YYYY-MM-DD" (single day)
  startDate?: string; // "YYYY-MM-DD" (range start)
  endDate?: string; // "YYYY-MM-DD" (range end)
};

/** Body for PUT /edit — bulk replace sessions of one schedule */
export type EditScheduleBodyInput = {
  scheduleId: string;
  sessions: ISession[]; // full replacement; server recomputes + validates
};

/** Body for PATCH /:scheduleId/sessions/:sessionId — single-session patch */
export type EditSingleSessionBodyInput = {
  patch: Partial<ISession>;
  note?: string;
};

/** OPTIONAL: if you’re using the `{ userIds, date, sessions }` create route */
export type CreateSchedulesForUsersBodyInput = {
  userIds: string[];
  date: string; // "YYYY-MM-DD"
  sessions: Array<{
    label: string; // NEW: required — must be sent from UI
    scheduledStartTime: string; // "HH:mm"
    scheduledEndTime: string; // "HH:mm"
    startMealTime?: string[];
  }>;
};
