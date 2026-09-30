export type RequirementDataType = {
  name: string;
  fileType: string;
};

export interface JobUpdatePayload {
  _id: string | undefined;
  title: string | undefined;
  description: string | undefined;
  location: string | undefined;
  employmentType: string | undefined;
  category: string | undefined;
  qualifications: string[];
  customRequirements: RequirementDataType[];
  profileImageFile: File | null;
}

export interface JobUpdateResponse {
  success: boolean;
  message: string;
  job: JobDetails;
}

export interface JobDetails {
  _id: string;
  title: string;
  description: string;
  location: string;
  employmentType: string;
  category: string;
  qualifications: string[];
  customRequirements: string[];
  imageUrl: string | undefined;
}
