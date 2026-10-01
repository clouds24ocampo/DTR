import axiosInstance from "../../axios/axiosInstance";

export const loginApi = async (email: string, password: string) => {
  const response = await axiosInstance.post("/api/auth/login", {
    email,
    password,
  });
  return response;
};

export const logoutApi = async () => {
  const response = await axiosInstance.post("/api/auth/logout");
  return response;
};

export const requestPasswordResetPinApi = async (email: string) => {
  const response = await axiosInstance.post("/api/auth/forgot-password/request-pin", {
    email,
  });
  return response;
};

export const verifyPasswordResetPinApi = async (email: string, pin: string) => {
  const response = await axiosInstance.post("/api/auth/forgot-password/verify-pin", {
    email,
    pin,
  });
  return response;
};

export const resetPasswordApi = async (email: string, pin: string, newPassword: string) => {
  const response = await axiosInstance.post("/api/auth/forgot-password/reset", {
    email,
    pin,
    newPassword,
  });
  return response;
};

export const registerSuperAdminApi = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
}) => {
  const response = await axiosInstance.post("/api/auth/register-admin", data);
  return response;
};
