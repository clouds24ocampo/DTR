import { AxiosError } from "axios";
import axiosInstance from "../../axios/axiosInstance";

export interface EmployeeRegistrationInput {
  _id?: string;
  username: string;
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  middleName: string;
  idNumber?: string;
  position: string | string[];
  workInfo: string;
  location: string;
  salaryType: string;
  salary: string;
}

export interface EditEmployeeRegistrationInput {
  _id?: string;
  username: string;
  email: string;
  lastName: string;
  firstName: string;
  middleName: string;
  idNumber: string;
  position: string | string[];
  workInfo: string;
  location: string;
  salaryType: string;
  salary: string;
}

export const fetchEmployees = async () => {
  try {
    const response = await axiosInstance.get("/api/users/");
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching profile:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const sendEmployeeDataToApi = async (
  payload: EmployeeRegistrationInput
): Promise<boolean> => {
  try {
    const response = await axiosInstance.post(`/api/users/register`, payload);
    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const updateEmployeeDataToApi = async (
  payload: EditEmployeeRegistrationInput
): Promise<boolean> => {
  try {
    const response = await axiosInstance.put(
      `/api/users/update-employee/${payload._id}`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const archiveEmployee = async (id: string): Promise<boolean> => {
  try {
    const response = await axiosInstance.put(`/api/users/archive/${id}`);
    return response.status === 200;
  } catch (error) {
    console.error("Error archiving employee:", error);
    return false;
  }
};

export const unarchiveEmployee = async (id: string): Promise<boolean> => {
  try {
    const response = await axiosInstance.put(`/api/users/unarchive/${id}`);
    return response.status === 200;
  } catch (error) {
    console.error("Error unarchiving employee:", error);
    return false;
  }
};
export const deleteEmployee = async (id: string): Promise<boolean> => {
  try {
    const response = await axiosInstance.delete(`/api/users/delete/${id}`);
    return response.status === 200;
  } catch (error) {
    console.error("Error deleting employee:", error);
    return false;
  }
};
