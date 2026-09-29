import { AxiosError } from "axios";

// Common error handler function
export const handleError = (error: AxiosError | any) => {
  // Don't log 401 errors - they're expected when not authenticated
  if (error?.response?.status === 401) {
    throw error;
  }

  const errorMessage =
    error.response?.data?.message ||
    error.message ||
    "An unknown error occurred";

  console.error("API call failed:", errorMessage);

  // Throw the error with the message
  throw new Error(errorMessage);
};
