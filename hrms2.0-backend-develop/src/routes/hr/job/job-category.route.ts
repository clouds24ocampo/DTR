import express from "express";
import {
  getCategories,
  createCategory,
  deleteCategory,
  getApplicantsPerCategory,
} from "../../../controllers/hr/job/job-category.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const router = express.Router();

router.get("/", getCategories);

router.get("/applicants-per-category", getApplicantsPerCategory);

router.post("/", createCategory);

router.delete("/:id", deleteCategory);

export default router;
