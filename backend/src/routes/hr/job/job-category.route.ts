import express from "express";
import protectRoute from "../../../middleware/protectedRoute";
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

router.post("/", protectRoute, authMiddleware(["HR"]), createCategory);

router.delete("/:id", protectRoute, authMiddleware(["HR"]), deleteCategory);

export default router;
