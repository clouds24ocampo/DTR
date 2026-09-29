import express from "express";
import {
  createDeclinedEntry,
  getDeclinedEntriesByUserAndDate,
} from "../../controllers/global/declined-entry/declined-entry.controller";

const router = express.Router();

router.post("/create", createDeclinedEntry);

router.post("/filtered", getDeclinedEntriesByUserAndDate);

export default router;

