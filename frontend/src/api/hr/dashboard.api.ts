import axiosInstance from "../../axios/axiosInstance";
import { AxiosError } from "axios";

// Function to fetch all applicants
export const fetchApplicants = async () => {
  try {
    const response = await axiosInstance.get("/api/applications/applicants");
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching applicants:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const fetchApplicantsPerCategory = async (token: string) => {
  try {
    const response = await axiosInstance.get(
      "/api/categories/applicants-per-category",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching applicants per category:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const fetchJobsByCategory = async (token: string, category: string) => {
  try {
    const response = await axiosInstance.get(`/api/jobs?category=${category}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching jobs by category:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};
