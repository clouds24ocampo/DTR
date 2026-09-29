import mongoose, { Document, Schema } from "mongoose";

export type Role =
  | "Employee"
  | "Team Leader - Field"
  | "Team Leader - Operation"
  | "Workforce"
  | "HR"
  | "Operation Manager"
  | "Intern"
  | "Trainee"
  | "Provisionary"
  | "Instructor"
  | "Student"
  | "Marketer"
  | "Employee - Field"
  | "Employee - Operation"
  | "Frontline / Agent Roles"
  | "Specialized Agent Roles"
  | "Supervisory & Management Roles"
  | "Support & Back-Office Roles";

export type SalaryType = "monthly" | "15th day" | "weekly" | "daily" | "hourly";

export interface IUser extends Document {
  _id: string;
  username: string;
  password: string;
  position: Role[];
  archived: boolean;
  firstName: string;
  middleName?: string;
  lastName: string;
  idNumber: string;
  workInfo?: string;
  location?: string;
  salary?: number;
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
  deviceAccessToken?: string;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    position: {
      type: [String],
      enum: [
        "Employee",
        "Team Leader - Field",
        "Team Leader - Operation",
        "Workforce",
        "HR",
        "Operation Manager",
        "Intern",
        "Trainee",
        "Provisionary",
        "Instructor",
        "Student",
        "Marketer",
        "Employee - Field",
        "Employee - Operation",
        "Frontline / Agent Roles",
        "Specialized Agent Roles",
        "Supervisory & Management Roles",
        "Support & Back-Office Roles",
      ],
      default: ["Employee"],
    },
    archived: { type: Boolean, default: false },
    firstName: { type: String, required: true },
    middleName: { type: String, required: false },
    lastName: { type: String, required: true },
    idNumber: { type: String, required: true, unique: true },
    workInfo: { type: String, required: false, default: "" },
    location: { type: String, required: false, default: "" },
    salary: { type: Number, required: false, default: 0 },
    salaryType: {
      type: String,
      enum: ["monthly", "15th day", "weekly", "daily", "hourly"],
      required: true,
    },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    about: { type: String, default: "" },
    gender: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    profilePicture: { type: String, default: "" },
    sss: { type: Boolean, default: false },
    philhealth: { type: Boolean, default: false },
    pagibig: { type: Boolean, default: false },
    deviceAccessToken: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    // roles removed as position now handles multiple roles
  },
  { timestamps: true }
);

// Add text index for efficient search
UserSchema.index({
  firstName: "text",
  lastName: "text",
  username: "text",
  email: "text",
  position: "text",
});

const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
