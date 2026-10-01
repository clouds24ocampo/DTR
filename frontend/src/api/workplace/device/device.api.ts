/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../../../axios/axiosInstance";
import { handleError } from "../../../axios/errorHandler";

export const registerDevice = async (userId: string) => {
    try {
        const response = await axiosInstance.post("/api/device/register", { userId });
        return response.data;
    } catch (error: unknown) {
        return handleError(error);
    }
};

export const verifyDevice = async (userId: string, token: string) => {
    try {
        const response = await axiosInstance.post("/api/device/verify", { userId, token });
        return response.data;
    } catch (error: unknown) {
        // If verification fails, we don't necessarily want to trigger a global error
        // but we need to know it failed.
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as any;
            if (axiosError.response?.status === 401) {
                throw error;
            }
        }
        return handleError(error);
    }
};
