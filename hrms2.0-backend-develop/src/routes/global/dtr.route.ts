import express from "express";
import protectRoute from "src/middleware/protectedRoute";
import {
  createDTR,
  endDTRItem,
  getAllDTRs,
  getDTRsByDate,
  getDTRsByUserAndDate,
  getDTRsByUserId,
  getMyDTRByDate,
  getPendingTripApprovals,
  startDTRItem,
  updateTripApproval,
  cancelTrip,
} from "../../controllers/global/dtr/dtr.controller";

import { botDetectionMiddleware } from "../../middleware/botDetection";

const router = express.Router();

router.post(
  "/create",
  botDetectionMiddleware,
  createDTR
);

router.post("/start", botDetectionMiddleware, startDTRItem);

router.post("/end", botDetectionMiddleware, endDTRItem);

router.get("/", protectRoute, getAllDTRs);

router.get("/user/:userId", getDTRsByUserId);

router.get("/date/:date", protectRoute, getDTRsByDate);

router.get("/me/date/:date", protectRoute, getMyDTRByDate);

router.post("/filtered", getDTRsByUserAndDate);

router.get("/trips/pending", protectRoute, getPendingTripApprovals);

router.post("/trips/approve", protectRoute, updateTripApproval);

router.post("/trips/cancel", botDetectionMiddleware, cancelTrip);

export default router;
