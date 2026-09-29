import express from "express";
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
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getJobs);

router.get("/:id", getJobById);

router.get(
  "/:id/applicants",
  getJobApplicants
);

router.post(
  "/post-job",
  upload.single("image"),
  createJob
);

router.put("/:id", upload.single("image"), updateJob);

router.delete("/:id", deleteJob);

export default router;
