
export type RequirementDataType = {
  name: string;
  fileType: string;
}

export type addJobDataType = {
  title: string;
  description: string;
  location: string;
  employmentType: string;
  category: string;
  jobStatus: string;
  image: File | null;
  qualifications: string[];
  customRequirements: RequirementDataType[];
  timeDuration: string;
  totalNumberOfQuestions: number | undefined;
};

export type jobStoreType = {
  jobData: addJobDataType | null; 
  jobState: (formData: addJobDataType) => Promise<boolean>;
};
