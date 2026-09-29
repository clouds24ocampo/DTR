import { FieldConfig } from "../../types/employee/employeeFormTypes";

export const POSITION_OPTIONS = [
  { value: "HR", label: "HR" },
  { value: "Employee", label: "Employee" },
  { value: "Workforce", label: "Workforce" },
  { value: "Operation Manager", label: "Operation Manager" },
  { value: "Team Leader - Field", label: "Team Leader - Field" },
  { value: "Team Leader - Operation", label: "Team Leader - Operation" },
  { value: "Intern", label: "Intern" },
  { value: "Trainee", label: "Trainee" },
  { value: "Provisionary", label: "Provisionary" },
  { value: "Instructor", label: "Instructor" },
  { value: "Student", label: "Student" },
  { value: "Marketer", label: "Marketer" },
  { value: "Employee - Field", label: "Employee - Field" },
  { value: "Employee - Operation", label: "Employee - Operation" },
  { value: "Frontline / Agent Roles", label: "Frontline / Agent Roles" },
  { value: "Specialized Agent Roles", label: "Specialized Agent Roles" },
  { value: "Supervisory & Management Roles", label: "Supervisory & Management Roles" },
  { value: "Support & Back-Office Roles", label: "Support & Back-Office Roles" },
];

export const SALARY_TYPE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "15th day", label: "15th Day" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "hourly", label: "Hourly" },
];

export const FIELD_DESCRIPTIONS: Record<string, string> = {
  username: "Unique username for the employee account. This will be used for login. Format: Employee-{ID}",
  email: "Valid email address for the employee. Used for account communication and password recovery.",
  password: "Initial password for the employee account. The employee should change this after first login for security.",
  lastName: "Employee's last name or surname. This is a required field for identification.",
  firstName: "Employee's first name or given name. This is a required field for identification.",
  middleName: "Employee's middle name (optional). Leave blank if not applicable.",
  idNumber: "Unique employee identification number. This is used for tracking and must be unique across all employees.",
  location: "Employee's work location or address (optional). Can be used for geofencing and location-based features.",
  salary: "Employee's salary amount (optional). Enter as a number without currency symbols. This can be updated later.",
  position: "Select the employee's role or position in the organization. This determines their access level and permissions within the system. Available positions include HR, Employee, Workforce, Operation Manager, Team Leader - Field, Team Leader - Operation, Intern, Trainee, Provisionary, Instructor, Student, Marketer, Field Technician, Software Developer, Frontline / Agent Roles, Specialized Agent Roles, Supervisory & Management Roles, and Support & Back-Office Roles.",
  salaryType: "Select how the employee's salary is paid. Options include Monthly (full month), 15th Day (mid-month payment), Weekly, Daily, or Hourly. This determines the payroll calculation method.",
  workInfo: "Additional work-related information about the employee (optional). This can include work arrangements like 'Hybrid', 'Remote', 'On-site', or any other relevant details about their work setup.",
};

export const getFieldConfigs = (mode: "add" | "edit"): FieldConfig[] => {
  const baseFields: FieldConfig[] = [
    {
      name: "username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "Username",
      description: FIELD_DESCRIPTIONS.username,
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      placeholder: "Email",
      description: FIELD_DESCRIPTIONS.email,
    },
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      required: true,
      placeholder: "First name",
      description: FIELD_DESCRIPTIONS.firstName,
    },
    {
      name: "middleName",
      label: "Middle Name",
      type: "text",
      required: false,
      placeholder: "Middle name (optional)",
      description: FIELD_DESCRIPTIONS.middleName,
    },
    {
      name: "lastName",
      label: "Last Name",
      type: "text",
      required: true,
      placeholder: "Last name",
      description: FIELD_DESCRIPTIONS.lastName,
    },
    {
      name: "idNumber",
      label: mode === "edit" ? "Employee ID" : "ID number",
      type: "text",
      required: true,
      placeholder: "ID number",
      description: FIELD_DESCRIPTIONS.idNumber,
    },
    {
      name: "position",
      label: "Position",
      type: "checkbox-group",
      required: true,
      placeholder: "Select Positions",
      description: FIELD_DESCRIPTIONS.position,
      options: POSITION_OPTIONS,
    },
    {
      name: "location",
      label: "Location",
      type: "text",
      required: false,
      placeholder: "Location (optional)",
      description: FIELD_DESCRIPTIONS.location,
    },
    {
      name: "salary",
      label: "Salary",
      type: "number",
      required: false,
      placeholder: mode === "edit" ? "Salary (optional)" : "Salary",
      description: FIELD_DESCRIPTIONS.salary,
    },
    {
      name: "salaryType",
      label: "Salary Type",
      type: "select",
      required: true,
      placeholder: "Select Salary Type",
      description: FIELD_DESCRIPTIONS.salaryType,
      options: SALARY_TYPE_OPTIONS,
    },
  ];

  // Add password field only for add mode
  if (mode === "add") {
    baseFields.splice(2, 0, {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Password",
      description: FIELD_DESCRIPTIONS.password,
    });
  }

  return baseFields;
};

export const getWorkInfoConfig = (): FieldConfig => ({
  name: "workInfo",
  label: "Work Information",
  type: "textarea",
  required: false,
  placeholder: "Work information (optional)",
  description: FIELD_DESCRIPTIONS.workInfo,
  rows: 3,
});

