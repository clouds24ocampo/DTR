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

export type SalaryType = "monthly";

export type UserType = {
  _id: string;
  username: string;
  password: string;
  position: Role;
  archived: boolean;
  firstName: string;
  middleName: string;
  lastName: string;
  idNumber: string;
  workInfo: string;
  location: string;
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
  createdBy?: string;
};

export type UserStoreType = {
  user: UserType | null;
  fetchUserLoading: boolean;
  updateUserLoading: boolean;
  fetchUser: (id: string) => Promise<UserType | null>;
  updateUser: (user: UserType) => Promise<boolean>;
};
