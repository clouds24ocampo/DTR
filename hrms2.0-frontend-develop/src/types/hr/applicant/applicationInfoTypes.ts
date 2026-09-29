/* eslint-disable @typescript-eslint/no-explicit-any */
export type Requirement = {
  reqFile: string;
  requirementName: string;
  _id: string;
};

export type Schedule = {
  date: string;
  time: string;
  location: string;
  type: string;
  requirementsToBring: string[];
};

export type QueueStatus = {
  status: string;
};

export type Applicant = {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    description: string;
    qualifications: string[];
    location: string;
    employmentType: string;
    category: string;
    customRequirements: {
      name: string;
      fileType: string;
      _id: string;
    }[];
    image: string;
    postedAt: string;
  };
  applicantId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  birthday: string;
  gender: string;
  age: number;
  civilStatus: string;
  address: string;
  email: string;
  phoneNumber: string;
  citizenship: string;
  placeOfBirth: string;
  reference: {
    name: string;
    relationship: string;
    contactNumber: string;
    _id: string;
  }[];
  education: {
    address: string;
    level: string;
    schoolName: string;
    fromYear: string;
    toYear: string;
    degree: string;
    _id: string;
  }[];
  workExperience: {
    companyName: string;
    companyLocation: string;
    position: string;
    fromYear: string;
    toYear: string;
    reasonForLeaving: string;
    _id: string;
  }[];
  majorSkills: string[];
  profileImage: string;
  status: string;
  quizAttempts: any[];
  uploadedFiles: any[];
  uploadedJobOfferLetter: File;
  submittedAt: string;
  __v: number;
  score: number;
  percentage: number;
  interviewSchedule: Schedule[];
  queueStatus: QueueStatus[];
  rejectionReason: string;
};
export type Education = {
  level: string;
  schoolName: string;
  address: string;
  degree: string;
  fromYear: string;
  toYear: string;
};

export type Experience = {
  companyName: string;
  companyLocation: string;
  position: string;
  fromYear: string;
  toYear: string;
  reasonForLeaving: string;
};

export type Contacts = {
  name: string;
  relationship: string;
  contactNumber: string;
};

export type Category = {
  _id: string;
  name: string;
};

export type ContactsDataTypes = {
  name: string;
  relationship: string;
  contactNumber: string;
};

export type EducationDataType = {
  level: string;
  schoolName: string;
  address: string;
  degree: string;
  fromYear: string;
  toYear: string;
};

export type ExperienceDataType = {
  companyName: string;
  companyLocation: string;
  position: string;
  fromYear: string;
  toYear: string;
  reasonForLeaving: string;
};
export type ApplicantInformationDataType = {
  _id?: string;
  jobId: string;
  applicantId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  nameExtension: string;
  birthday: string;
  gender: string;
  age: number;
  civilStatus: string;
  citizenship: string;
  placeOfBirth: string;
  address: string;
  email: string;
  phoneNumber: number;
  quizScore: number;
  profileImage: File | null;
  education: EducationDataType[];
  workExperience: ExperienceDataType[];
  majorSkills: string[][];
  reference: ContactsDataTypes[];
};

export type QueueType = {
  applicantId: string;
}

export type InfoStoreType = {
  applicantData: boolean;
  applicantInfoState: (
    formData: ApplicantInformationDataType
  ) => Promise<boolean>;
};
