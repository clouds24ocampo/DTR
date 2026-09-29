export interface ProfileData {
  username: string;
  password: string;
  position: string;
  archived: boolean;
  firstName: string;
  middleName: string;
  lastName: string;
  idNumber: string;
  workInfo: string;
  location: string;
  salary: number;
  salaryType: string;
  email: string;
  phone: string;
  about: string;
  gender: string;
  dateOfBirth: string | null;
  profilePicture: string;
  roles?: string[];
}
