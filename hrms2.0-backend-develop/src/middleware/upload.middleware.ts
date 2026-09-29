import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const sanitizeFilename = (filename: string) => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory); // ✅ Save files in "uploads/"
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const cleanedName = sanitizeFilename(file.originalname);
    cb(null, `${timestamp}-${cleanedName}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = {
    documents: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    images: ["image/jpeg", "image/png"],
  };

  const isImage = allowedTypes.images.includes(file.mimetype);
  const isDocument = allowedTypes.documents.includes(file.mimetype);

  if (req.path.includes("/apply") && !isImage) {
    return cb(
      new Error("Invalid file type. Profile image must be JPG or PNG."),
      false
    );
  }

  if (req.path.includes("/upload") && !(isImage || isDocument)) {
    return cb(
      new Error("Invalid file type. Only PDF, DOCX, JPG, and PNG are allowed."),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

export const uploadProfileImage = upload.single("profileImage");
export const uploadDocument = upload.single("file");

export default upload;
