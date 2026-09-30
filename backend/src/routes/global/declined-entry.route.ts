import express from "express";
import protectRoute from "../../middleware/protectedRoute";
import {
  createDeclinedEntry,
  getDeclinedEntriesByUserAndDate,
} from "../../controllers/global/declined-entry/declined-entry.controller";

const router = express.Router();
router.use(protectRoute);

router.post("/create", createDeclinedEntry);

router.post("/filtered", getDeclinedEntriesByUserAndDate);

export default router;

