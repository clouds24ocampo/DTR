import { uploadLimits } from "src/config/app.config";
import express from "express";
import protectRoute from "../../../middleware/protectedRoute";
import multer from "multer";
import {
  getJobs,
  getJobById,
  getJobApplicants,
  createJob,
  updateJob,
  deleteJob,
} from "../../../controllers/hr/job/job.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const  router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: uploadLimits });

router.get("/", getJobs);

router.get("/:id", getJobById);

router.get(
  "/:id/applicants",
  protectRoute,
  authMiddleware(["HR"]),
  getJobApplicants
);

router.post(
  "/post-job",
  protectRoute,
  authMiddleware(["HR"]),
  upload.single("image"),
  createJob
);

router.put("/:id", protectRoute, authMiddleware(["HR"]), upload.single("image"), updateJob);

router.delete("/:id", protectRoute, authMiddleware(["HR"]), deleteJob);

export default router;
