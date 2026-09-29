export type AccountType = {
  _id: string;
  email: string;
  position?: string[];
  token: string;
  password: string;
  teamId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  profilePicture?: string;
  idNumber?: string;
  department?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string
  location?: string;
  emergencyContact?: string;
  dateHired?: string;
  salary?: number;
  salaryType?: string;
  bankDetails?: string;
  taxInformation?: string;
  gender?: string;
  about?: string;
  archived?: boolean;
};

export type AuthStoreType = {
  account: AccountType | null;
  loginLoading: boolean;
  logoutLoading: boolean;
  forgotPasswordLoading: boolean;
  verifyPinLoading: boolean;
  resetPasswordLoading: boolean;
  isSwitching: boolean;

  login: ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logoutUser: () => Promise<void>;
  setAccount: (account: AccountType | null) => void;
  requestPasswordResetPin: (email: string) => Promise<boolean>;
  verifyPasswordResetPin: (email: string, pin: string) => Promise<boolean>;
  resetPassword: (email: string, pin: string, newPassword: string) => Promise<boolean>;
  switchRole: (role: string) => Promise<boolean>;
  setIsSwitching: (isSwitching: boolean) => void;
  showSplash: boolean;
  setShowSplash: (showSplash: boolean) => void;
};
