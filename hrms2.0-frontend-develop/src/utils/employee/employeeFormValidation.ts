import { EmployeeFormFields } from "../../types/employee/employeeFormTypes";

export const getRequiredFields = (mode: "add" | "edit"): (keyof EmployeeFormFields)[] => {
  const baseFields: (keyof EmployeeFormFields)[] = [
    "username",
    "email",
    "lastName",
    "firstName",
    "position",
    "idNumber",
    "salaryType",
  ];

  if (mode === "add") {
    return [...baseFields, "password"];
  }

  return baseFields;
};

export const validateForm = (
  formData: EmployeeFormFields,
  mode: "add" | "edit"
): { isValid: boolean; errorMessage?: string } => {
  const requiredFields = getRequiredFields(mode);

  for (const field of requiredFields) {
    const value = formData[field];
    if (!value) {
      // Check for empty string or null/undefined
      return {
        isValid: false,
        errorMessage: "All required fields must be filled.",
      };
    }

    if (Array.isArray(value) && value.length === 0) {
      // Check for empty array
      return {
        isValid: false,
        errorMessage: "At least one position must be selected.",
      };
    }

    if (typeof value === "string" && value.trim() === "") {
      // Check for empty string
      return {
        isValid: false,
        errorMessage: "All required fields must be filled.",
      };
    }
  }

  return { isValid: true };
};

export const prepareFormData = (
  formData: EmployeeFormFields,
  mode: "add" | "edit"
): EmployeeFormFields => {
  const prepared: EmployeeFormFields = {
    ...formData,
    middleName: formData.middleName || "",
    location: formData.location || "",
    workInfo: formData.workInfo || "",
    salary: formData.salary || "",
  };

  // Ensure password is set for add mode
  if (mode === "add" && !prepared.password) {
    prepared.password = "";
  }

  return prepared;
};

