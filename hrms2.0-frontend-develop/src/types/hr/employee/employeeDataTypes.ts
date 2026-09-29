export type Schedule = {
  category: string;
  startTime: string;
  endTime: string;
  type: string;
};

export type ScheduleSessions = {
  _id: string;
  category: string;
  startTime: string;
  endTime: string;
  type: string;
};

export type FilteredSchedule = {
  _id: string;
  date: string;
  sessions: Sessions[];
  workplace: string;
  workstation: string;
  type: string;
};

export type Employee = {
  _id: string;
  username: string;
  position: string;
  archived: boolean;
  firstName: string;
  middleName: string;
  lastName: string;
  idNumber: string;
  location: string;
  email: string;
  workInfo: string;
  profilePicture: string;
};

export type Sessions = {
  category: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  duration: string;
  schedule: string;
}

export type DTR = {
  _id: string;
  date: string;
  sessions: Sessions[];
}

export type User = {
  _id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  extensionName: string;
  position: string;
}


