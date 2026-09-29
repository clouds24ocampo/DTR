import { AxiosError } from "axios";
import axiosInstance from "../../../axios/axiosInstance";

export interface DocumentInput {
  documentType: "contract" | "resolution";
  title: string;
  content: string;
  dateDrafted: string;
  seriesYear: string;
}

export const sendDocumentDataToApi = async (
  payload: DocumentInput
): Promise<boolean> => {
  try {
    const response = await axiosInstance.post(
      `/api/document/add-document`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const fetchDocuments = async () => {
  try {
    const response = await axiosInstance.get("api/document/all-documents");
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error(
        "Error fetching documents:",
        error.response?.data || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const EditDocumentDataToApi = async (
  id: string,
  payload: DocumentInput
): Promise<boolean> => {
  console.log("Editing Document with ID:", id, "Payload:", payload);
  try {
    const response = await axiosInstance.put(
      `/api/document/update-document/${id}`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const deleteDocument = async (id: string): Promise<boolean> => {
  try {
    const response = await axiosInstance.delete(`/api/document/delete-document/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};
