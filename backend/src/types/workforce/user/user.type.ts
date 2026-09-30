import mongoose, { Document } from "mongoose";

export type Role =
  | "Employee"
  | "Team Leader"
  | "Workforce"
  | "Software Developer"
  | "Lead Developer"
  | "Software Engineer";

export type SalaryType = "monthly";

export interface IUser extends Document<string> {
  _id: string;
  username: string;
  password: string;
  position: Role;
  archived: boolean;
  firstName: string;
  middleName: string;
  lastName: string;
  idNumber: string;
  salary: number;
  salaryType: SalaryType;
  email?: string;
  phone?: string;
  about?: string;
  gender?: string;
  dateOfBirth?: Date;
  profilePicture?: string;
  sss?: boolean;
  philhealth?: boolean;
  pagibig?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Schema.Types.ObjectId;
}

export interface UserUpdateDTO {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  about?: string;
  gender?: string;
  dateOfBirth?: Date;
  profilePicture?: string;
  position?: Role;
  salary?: number;
  archived?: boolean;
  sss?: boolean;
  philhealth?: boolean;
  pagibig?: boolean;
}

export interface EmployeeDetailsDTO {
  idNumber: string;
  position: Role;
  salary: number;
  salaryType: SalaryType;
  email?: string;
  phone?: string;
  about?: string;
  gender?: string;
  dateOfBirth?: Date;
  profilePicture?: string;
  sss?: boolean;
  philhealth?: boolean;
  pagibig?: boolean;
  archived: boolean;
}
