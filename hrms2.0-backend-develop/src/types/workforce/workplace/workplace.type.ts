export interface CreateWorkplaceBodyInput {
  name: string;
  workstationCount: number;
  stationNames?: string[];
}

export interface UpdateWorkplaceBodyInput {
  name: string;
  workstationCount: number;
  stationNames?: string[];
}

export interface AssignToWorkstationBodyInput {
  date: string;
  stationName?: string;
  user: { id: string };
  label: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  startMealTime?: string[];
}

export interface UpdateWorkstationBodyInput {
  stationName: string;
}

export interface WorkplaceAssignedUser {
  userId: string;
  label: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  startMealTime: string[];
}

export interface WorkplaceStationDay {
  date: string;
  assignedUsers: WorkplaceAssignedUser[];
}

export interface Workstation {
  _id: string;
  stationName: string;
  dates: WorkplaceStationDay[];
}

export interface IWorkplace {
  _id: string;
  name: string;
  workstationCount: number;
  workstations: Workstation[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface WorkplaceDoc {
  _id: string;
  name: string;
  workstationCount: number;
  workstations: Workstation[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface WorkplaceDayView {
  workplaceId: string;
  name: string;
  workstationCount: number;
  stations: {
    workstationId: string;
    stationName: string;
    date: string;
    assignedUsers: WorkplaceAssignedUser[];
  }[];
}
