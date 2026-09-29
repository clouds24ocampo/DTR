import express from "express";
import {
  getQuizForCategory,
  addQuizToCategory,
  updateQuizInCategory,
  deleteQuizFromCategory,
} from "src/controllers/applicant/quiz.controller";
import { authMiddleware } from "src/middleware/auth.middleware";

const router = express.Router();

router.get("/:categoryId/quiz", getQuizForCategory);

router.post("/:categoryId/quiz/add", authMiddleware(["HR"]), addQuizToCategory);

router.put(
  "/:categoryId/quiz/:quizId",
  authMiddleware(["HR"]),
  updateQuizInCategory
);
router.delete(
  "/:categoryId/quiz/:quizId",
  authMiddleware(["HR"]),
  deleteQuizFromCategory
);

export default router;
