import axiosInstance from "../../axios/axiosInstance";

// Fetch job categories
export const fetchCategories = async () => {
  try {
    const response = await axiosInstance.get("api/categories");
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

// Fetch job posts
export const fetchJobPosts = async () => {
  try {
    const response = await axiosInstance.get("api/jobs");
    return response.data;
  } catch (error) {
    console.error("Error fetching job posts:", error);
    return [];
  }
};
