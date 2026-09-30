import mongoose, { Document } from "mongoose";

export interface IDepartment extends Document<string> {
  _id: string;
  name: string;
  type: string;
  description?: string;
  head?: mongoose.Types.ObjectId | null;
  members?: mongoose.Types.ObjectId[];
  location?: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface DepartmentUpdateDTO {
  name?: string;
  type?: string;
  description?: string;
  head?: mongoose.Types.ObjectId | string | null;
  members?: Array<mongoose.Types.ObjectId | string>;
  location?: string;
  status?: boolean;
}
export interface DepartmentDetailsDTO {
  name: string;
  type: string;
  description?: string;
  head?: mongoose.Types.ObjectId | string | null;
  members?: Array<mongoose.Types.ObjectId | string>;
  location?: string;
  status: boolean;
}

export interface CreateDepartmentBodyInput {
  name: string;
  type: string;
  description?: string;
  head?: string;
  members?: string[];
  location?: string;
  status?: boolean;
  createdBy?: string;
}

export interface DepartmentDoc {
  _id: string;
  name: string;
  type: string;
  description: string;
  head: string | null;
  members: string[];
  location: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
