/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../../axios/axiosInstance";

export const fetchPerformanceReviews = async () => {
    try {
        const response = await axiosInstance.get("/api/performance");
        return response.data;
    } catch (error) {
        console.error("Error fetching performance reviews:", error);
        return { success: false, data: [] };
    }
};

export const fetchPerformanceReviewById = async (reviewId: string) => {
    try {
        const response = await axiosInstance.get(`/api/performance/${reviewId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching performance review ${reviewId}:`, error);
        return { success: false, data: null };
    }
};

export const createPerformanceReview = async (payload: any) => {
    try {
        const response = await axiosInstance.post("/api/performance/create", payload);
        return response.data;
    } catch (error) {
        console.error("Error creating performance review:", error);
        return { success: false, message: "Failed to create review" };
    }
};

export const updatePerformanceReview = async (reviewId: string, payload: any) => {
    try {
        const response = await axiosInstance.put(`/api/performance/${reviewId}`, payload);
        return response.data;
    } catch (error) {
        console.error(`Error updating performance review ${reviewId}:`, error);
        return { success: false, message: "Failed to update review" };
    }
};

export const deletePerformanceReview = async (reviewId: string) => {
    try {
        const response = await axiosInstance.delete(`/api/performance/${reviewId}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting performance review ${reviewId}:`, error);
        return { success: false, message: "Failed to delete review" };
    }
};
