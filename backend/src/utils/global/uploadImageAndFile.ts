import { appConfig } from "src/config/app.config";
import axios from "axios";
import FormData from "form-data";

interface UploadResponse {
  url: string;
}

const uploadImageAndFile = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  const formData = new FormData();

  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");

  formData.append("file", file.buffer, {
    filename: `${timestamp}-${file.originalname}`,
    contentType: file.mimetype,
    knownLength: file.size,
  });
  formData.append("folder", folder);

  const uploadUrl = appConfig.services.fileUploaderUrl;
  if (!uploadUrl) throw new Error("FILE_UPLOADER_URL is not configured");

  try {
    const response = await axios.post<UploadResponse>(
      uploadUrl,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );
    return response.data.url;
  } catch (error) {
    throw new Error(`Failed to upload image: ${error}`);
  }
};

export default uploadImageAndFile;
