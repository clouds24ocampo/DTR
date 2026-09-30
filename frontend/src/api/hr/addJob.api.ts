import { addJobDataType } from "../../types/hr/job/jobTypes";
import instance from "../../axios/axiosInstance";
import { uploadFileInChunks } from "../../utils/global/chunkUploader";

interface Account {
  _id: string;
  username: string;
  position: string;
  token: string;
}

interface State {
  account: Account;
}

interface StorageData {
  state: State;
  version: number;
}

export const sendJobDataToAPI = async (
  formData: addJobDataType
): Promise<boolean> => {
  try {
    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("location", formData.location);
    formDataToSend.append("employmentType", formData.employmentType);
    formDataToSend.append("category", formData.category);
    formDataToSend.append("jobStatus", formData.jobStatus);

    if (formData.image) {
      const fileToken = await uploadFileInChunks(
        formData.image,
        "hrms/admin/hr/jobs"
      );
      formDataToSend.append("image", fileToken);
    }

    formData.qualifications.forEach((qualification, index) => {
      formDataToSend.append(`qualifications[${index}]`, qualification);
    });

    formData.customRequirements.forEach((req, index) => {
      formDataToSend.append(`customRequirements[${index}][name]`, req.name);
      formDataToSend.append(
        `customRequirements[${index}][fileType]`,
        req.fileType
      );
    });

    formDataToSend.append("timeDuration", formData.timeDuration);
    formDataToSend.append(
      "totalNumberOfQuestions",
      String(formData.totalNumberOfQuestions)
    );

    let token: string | null = null;

    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      const parsedData: StorageData = JSON.parse(authStorage);

      token = parsedData.state.account.token;
    } else {
      console.log("No auth data found in localStorage");
    }

    const response = await instance.post("/api/jobs/post-job", formDataToSend, {
      headers: {
        "Content-Type": `multipart/form-data`,
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};

export const deleteJobPost = async (jobId: string) => {
  try {
    const response = await instance.delete(`/api/jobs/${jobId}`);

    if (response.status === 200) {
      return { success: true };
    } else {
      throw new Error("Failed to delete job post");
    }
  } catch (error) {
    console.error("Error deleting job post:", error);
    return { success: false };
  }
};
