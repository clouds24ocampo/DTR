import axios, { AxiosError } from "axios";
const baseURL = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add request interceptor to attach Bearer token if present
axiosInstance.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("auth-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore storage access errors (e.g. SSR / private mode)
  }
  return config;
});

// Add response interceptor to handle 401 errors silently
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Silently handle 401 errors - don't log to console
    if (error.response?.status === 401) {
      // Suppress console errors for 401 - these are expected when not authenticated
      // The error will still be thrown so calling code can handle it appropriately
      return Promise.reject(error);
    }
    // For other errors, let them through normally
    return Promise.reject(error);
  }
);

export default axiosInstance;
