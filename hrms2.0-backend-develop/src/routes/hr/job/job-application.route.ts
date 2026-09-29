import express from "express";
import multer from "multer";
import {
  applyForJob,
  getApplicantDetailsById,
} from "../../../controllers/hr/job/job-application-apply.controller";
import { addQuizAttempt } from "../../../controllers/hr/job/job-application-quiz.controller";
import {
  uploadApplicationFile,
  pendingApplication,
  acceptedApplication,
  rejectApplication,
  getAllApplicants,
  getAllApplicantsForAllJobs,
  queueStatusDoneApplication,
  queueStatusPendingApplication,
} from "../../../controllers/hr/job/job-application-admin.controller";
import {
  scheduleInterview,
  finalizeInterview,
} from "../../../controllers/hr/job/job-interview.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { addToQueue } from "../../../controllers/hr/job/applicant-queue.controller";
import { uploadJobOfferLetter } from "../../../controllers/hr/job/job-offer-letter.controller";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/applicants", getAllApplicantsForAllJobs);

router.get("/:jobId/applicants", authMiddleware(["HR"]), getAllApplicants);

router.post("/status", getApplicantDetailsById);

router.post("/apply", applyForJob);

router.post("/:id/quiz-attempt", addQuizAttempt);

router.post("/:id/upload", upload.any(), uploadApplicationFile);

router.post("/queue", addToQueue);

router.post("/:id/upload-offer", uploadJobOfferLetter);

router.patch("/:id/pending", pendingApplication);

router.patch("/:id/reject", rejectApplication);

router.patch("/:id/queue-status-pending", queueStatusPendingApplication);

router.patch("/:id/queue-status-done", queueStatusDoneApplication);

router.patch("/:id/schedule-interview", scheduleInterview);

router.patch(
  "/:id/finalize-interview",
  authMiddleware(["HR"]),
  finalizeInterview
);

export default router;
