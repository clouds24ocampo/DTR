import axios from "axios";
import axiosInstance from "../../axios/axiosInstance";
import { uploadFileInChunks } from "../../utils/global/chunkUploader";

export const scheduleApplicant = async (
  id: string,
  type: string,
  date: string,
  time: string,
  location: string,
  requirementsToBring: string[]
): Promise<boolean> => {
  try {
    const response = await axiosInstance.patch(
      `/api/applications/${id}/schedule-interview`,
      {
        type, // Pass type as string
        date, // Pass date as string (YYYY-MM-DD)
        time, // Pass time as string (HH:MM AM/PM)
        location, // Pass location as string
        requirementsToBring, // Pass requirements as an array of strings
      }
    );
    if (response.status === 200) {
      return true;
    } else {
      throw new Error("Failed to schedule applicant");
    }
  } catch (error) {
    console.error("Error scheduling applicant:", error);
    return false;
  }
};

export const pendingApplicant = async (
  applicantId: string
): Promise<boolean> => {
  try {
    const response = await axiosInstance.patch(
      `/api/applications/${applicantId}/pending`
    );
    if (response.status === 200) {
      return true;
    } else {
      throw new Error("Failed to schedule applicant");
    }
  } catch (error) {
    console.error("Error scheduling applicant:", error);
    return false;
  }
};

export const acceptApplicant = async (
  applicantId: string,
  uploadedJobOfferLetter: File | null
): Promise<boolean> => {
  try {
    const formDataToSend = new FormData();

    if (uploadedJobOfferLetter) {
      const fileToken = await uploadFileInChunks(
        uploadedJobOfferLetter,
        "hrms/admin/hr/job-offer-letter"
      );
      formDataToSend.append("uploadedJobOfferLetter", fileToken);
    }

    const response = await axiosInstance.post(
      `/api/applications/${applicantId}/upload-offer`,
      formDataToSend
    );
    if (response.status === 200) {
      return true;
    } else {
      throw new Error("Failed to upload job offer letter");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unknown error:", error);
    }
    return false;
  }
};

export const rejectApplicant = async (
  applicantId: string,
  rejectionReason: string
): Promise<boolean> => {
  try {
    const response = await axiosInstance.patch(
      `/api/applications/${applicantId}/reject`,
      {
        rejectionReason,
      }
    );
    if (response.status === 200) {
      return true;
    } else {
      throw new Error("Failed to schedule applicant");
    }
  } catch (error) {
    console.error("Error scheduling applicant:", error);
    return false;
  }
};

export const pendingStatusApi = async (
  applicantId: string,
  token: string | undefined
): Promise<boolean> => {
  try {
    const response = await axiosInstance.patch(
      `/api/applications/${applicantId}/queue-status-pending`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      return true;
    } else {
      throw new Error("Failed to schedule applicant");
    }
  } catch (error) {
    console.error("Error scheduling applicant:", error);
    return false;
  }
};

export const doneStatusApi = async (
  applicantId: string,
  token: string | undefined
): Promise<boolean> => {
  try {
    const response = await axiosInstance.patch(
      `/api/applications/${applicantId}/queue-status-done`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      return true;
    } else {
      throw new Error("Failed to schedule applicant");
    }
  } catch (error) {
    console.error("Error scheduling applicant:", error);
    return false;
  }
};
