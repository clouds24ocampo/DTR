/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

export const createMessage = async (message: string): Promise<any | false> => {
  try {
    const webhookUrl = import.meta.env.VITE_CHATBOT_WEBHOOK_URL;
    if (!webhookUrl) return false; // chatbot not configured
    const { data } = await axios.post(
      webhookUrl,
      { message }
    );
    return data.output || false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};
