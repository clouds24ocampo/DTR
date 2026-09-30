import { uploadFileInChunks } from "../../utils/global/chunkUploader";
import axiosInstance from "../../axios/axiosInstance";
import { JobUpdateResponse } from "../../types/hr/hr/editJobTypes";

export const updateJob = async (
  id: string,
  title: string,
  description: string,
  location: string,
  employmentType: string,
  category: string,
  jobStatus: string,
  profileImageFile: File | null,
  qualificationsList: string[],
  customRequirements: { name: string; fileType: string }[],
  imageUrl: string
): Promise<JobUpdateResponse> => {
  try {
    const formData = new FormData();
    formData.append("title", title ?? "");
    formData.append("description", description ?? "");
    formData.append("location", location ?? "");
    formData.append("employmentType", employmentType ?? "");
    formData.append("category", category ?? "");
    formData.append("jobStatus", jobStatus ?? "");
    formData.append("timeDuration", "01:00");

    if (profileImageFile) {
      const fileToken = await uploadFileInChunks(
        profileImageFile,
        "hrms/admin/hr/jobs"
      );
      formData.append("image", fileToken);
    } else {
      formData.append("image", imageUrl);
    }

    qualificationsList.forEach((qualification, index) => {
      formData.append(`qualifications[${index}]`, qualification);
    });

    customRequirements.forEach((req, index) => {
      formData.append(`customRequirements[${index}][name]`, req.name);
      formData.append(`customRequirements[${index}][fileType]`, req.fileType);
    });

    const response = await axiosInstance.put(`/api/jobs/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Something went wrong while updating.";
    console.error("Error during job update:", errorMessage);
    throw new Error(errorMessage);
  }
};
