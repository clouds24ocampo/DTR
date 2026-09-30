export type EmployeeFormFields = {
  _id?: string;
  username: string;
  email: string;
  password?: string; // Only for add mode
  lastName: string;
  firstName: string;
  middleName: string;
  position: string | string[];
  idNumber: string;
  workInfo: string;
  location: string;
  salary: string;
  salaryType: string;
};

export type FormMode = "add" | "edit";

export type FieldConfig = {
  name: keyof EmployeeFormFields;
  label: string;
  type: "text" | "email" | "password" | "number" | "select" | "textarea" | "checkbox-group";
  required: boolean;
  placeholder: string;
  description: string;
  options?: { value: string; label: string }[];
  rows?: number; // For textarea
};

