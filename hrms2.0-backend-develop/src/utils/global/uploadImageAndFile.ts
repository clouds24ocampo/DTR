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

  try {
    const response = await axios.post<UploadResponse>(
      "https://fileuploader.cloudmateria.com/api/bcloud/fileuploader/upload",
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
