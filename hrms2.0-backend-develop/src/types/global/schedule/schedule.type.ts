export interface IFullSched {
  type: "work" | "break" | "meal";
  start: string;
  end: string;
}
export interface ISession {
  label: string;
  workCredits: string;
  breakCredits: string;
  breakCount: number;
  mealCredits: string;
  mealCount: number;
  scheduledStartTime: string;
  scheduledEndTime: string;
  startMealTime?: string[];
  fullSched: IFullSched[];
}
export interface IEditHistoryEntry {
  timestamp: string;
  editorId: string;
  change: "create" | "update" | "delete";
  sessionId?: string;
  note?: string;
  before?: Partial<ISession>;
  after?: Partial<ISession>;
}
export interface ISchedule {
  userId: string;
  date: string;
  teamName?: string;
  workstationId?: string;
  sessions: ISession[];
  editHistory?: IEditHistoryEntry[];
}

export type IScheduleDoc = ISchedule & { _id: string };

export type CreateSchedulesBodyInput = {
  date: string;
  assignments: Array<
    Pick<ISchedule, "userId" | "teamName" | "workstationId" | "sessions">
  >;
};

export type GetSchedulesByUserAndDateBodyInput = {
  userId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
};

export type EditScheduleBodyInput = {
  scheduleId: string;
  sessions: ISession[];
};

export type EditSingleSessionBodyInput = {
  patch: Partial<ISession>;
  note?: string;
};

export type CreateSchedulesForUsersBodyInput = {
  userIds: string[];
  date: string;
  workstationId?: string; // Add workstation context for overlap checking
  sessions: Array<{
    label: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    startMealTime?: string[];
  }>;
};
