/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

export const createMessage = async (message: string): Promise<any | false> => {
  try {
    const webhookUrl =
      import.meta.env.VITE_CHATBOT_WEBHOOK_URL ||
      "https://n8n.cloudmateria.com/webhook/wayne/bot";
    const { data } = await axios.post(
      webhookUrl,
      { message }
    );
    console.log("Chatbot response data:", data);
    return data.output || false;
  } catch (error) {
    console.error("Error in API call:", error);
    return false;
  }
};
