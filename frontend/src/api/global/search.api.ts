import axiosInstance from "../../axios/axiosInstance";

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

export interface SearchResponse {
  message: string;
  results: SearchResult[];
  query: string;
}

export const searchGlobal = async (query: string): Promise<SearchResponse> => {
  try {
    const response = await axiosInstance.get<SearchResponse>("/api/search", {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.error("Error searching:", error);
    throw error;
  }
};

