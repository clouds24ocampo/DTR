import axiosInstance from "../../axios/axiosInstance";

export const addCategory = async ({
  name,
}: {
  name: string;
}): Promise<boolean> => {
  try {
    const response = await axiosInstance.post(
      "/api/categories",
      { name },
    );
    if (response.status === 200 || response.status === 201) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const deleteCategory = async (
  _id: string,
  token: string
): Promise<boolean> => {
  try {
    const response = await axiosInstance.delete(`/api/categories/${_id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      return true;
    } else {
      throw new Error("Failed to delete job post");
    }
  } catch (error) {
    console.error("Error deleting job post:", error);
    return false;
  }
};
