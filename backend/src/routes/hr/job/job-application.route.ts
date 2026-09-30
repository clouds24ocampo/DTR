import { uploadLimits } from "src/config/app.config";
import express from "express";
import protectRoute from "../../../middleware/protectedRoute";
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
const upload = multer({ storage: multer.memoryStorage(), limits: uploadLimits });

router.get("/applicants", protectRoute, authMiddleware(["HR"]), getAllApplicantsForAllJobs);

router.get("/:jobId/applicants", protectRoute, authMiddleware(["HR"]), getAllApplicants);

router.post("/status", getApplicantDetailsById);

router.post("/apply", applyForJob);

router.post("/:id/quiz-attempt", addQuizAttempt);

router.post("/:id/upload", upload.any(), uploadApplicationFile);

router.post("/queue", addToQueue);

router.post("/:id/upload-offer", protectRoute, authMiddleware(["HR"]), uploadJobOfferLetter);

router.patch("/:id/pending", protectRoute, authMiddleware(["HR"]), pendingApplication);

router.patch("/:id/reject", protectRoute, authMiddleware(["HR"]), rejectApplication);

router.patch("/:id/queue-status-pending", protectRoute, authMiddleware(["HR"]), queueStatusPendingApplication);

router.patch("/:id/queue-status-done", protectRoute, authMiddleware(["HR"]), queueStatusDoneApplication);

router.patch("/:id/schedule-interview", protectRoute, authMiddleware(["HR"]), scheduleInterview);

router.patch(
  "/:id/finalize-interview",
  protectRoute,
  authMiddleware(["HR"]),
  finalizeInterview
);

export default router;
