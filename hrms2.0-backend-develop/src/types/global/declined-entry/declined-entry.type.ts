export type DeclinedActionType =
  | "work"
  | "break"
  | "meal"
  | "bio-break"
  | "clinic-break"
  | "system-issue"
  | "timeout";

export type DeclinedEntryCoordinates = {
  lat: number;
  lng: number;
};

export type DeclinedEntryScheduleInfo = {
  scheduledStartTime?: string;
  scheduledEndTime?: string;
};

export type DeclinedEntryEmployeeInfo = {
  idNumber?: string;
  name?: string;
  position?: string;
  profilePicture?: string;
};

export type DeclinedEntryDocLite = {
  _id?: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  actionType: DeclinedActionType;
  coordinates: DeclinedEntryCoordinates;
  timestamp: Date | string;
  scheduleInfo?: DeclinedEntryScheduleInfo;
  employeeInfo?: DeclinedEntryEmployeeInfo;
};

export type CreateDeclinedEntryBodyInput = {
  userId: string;
  date?: string; // "YYYY-MM-DD"
  actionType: DeclinedActionType;
  coordinates: DeclinedEntryCoordinates;
  scheduleInfo?: DeclinedEntryScheduleInfo;
  employeeInfo?: DeclinedEntryEmployeeInfo;
};

export type GetDeclinedEntriesByUserAndDateBodyInput = {
  userId: string;
  date: string; // "YYYY-MM-DD"
};

