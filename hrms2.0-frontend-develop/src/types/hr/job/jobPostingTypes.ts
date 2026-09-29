export interface Category {
  _id: string;
  name: string;
  quiz: string[];
}

export interface Requirements {
  name: string;
  fileType: string;
}
export interface JobPost {
  _id: number;
  category: string;
  title: string;
  description: string;
  jobStatus: string;
  image: string;
  location: string;
  employmentType: string;
  qualifications: string[];
  customRequirements: Requirements[];
  postedAt: string;
}
