// src/types/department/department.type.ts

/** Reusable ID alias for clarity (DB ObjectId serialized as string) */
export type Id = string;

/** Canonical Department document shape returned by the API */
export interface DepartmentDoc {
  _id: Id;
  name: string;
  type: string; // free-form user input
  description: string; // server normalizes to empty string if missing
  head: Id | null; // user id or null if unset
  members: Id[]; // array of user ids
  location: string; // server normalizes to empty string if missing
  status: boolean; // true = active, false = inactive
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: Id;
}

/** Payload for creating a department */
export interface CreateDepartmentBodyInput {
  name: string;
  type: string;
  description?: string;
  head?: Id; // optional user id (department head)
  members?: Id[]; // optional initial members
  location?: string;
  status?: boolean; // default true on server
  createdBy?: Id; // set by server/controller if omitted
}

/** Payload for updating a department */
export interface UpdateDepartmentBodyInput {
  name?: string;
  type?: string;
  description?: string;
  head?: Id | null; // pass null to unset head
  members?: Id[]; // full replacement of members list
  location?: string;
  status?: boolean;
}

/** Lightweight list item (useful for dropdowns, tables, etc.) */
export interface DepartmentListItem {
  _id: Id;
  name: string;
  type: string;
  status: boolean;
  head?: Id | null;
  membersCount?: number;
}
