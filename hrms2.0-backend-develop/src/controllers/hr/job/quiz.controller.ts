import { Request, Response } from "express";
import JobCategory from "../../../models/hr/job/job-category.model";

export const getQuizForCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categoryId } = req.params;

    const category = await JobCategory.findById(categoryId).select("quiz");
    if (!category) {
      res.status(404).json({ message: "Category not found." });
      return;
    }

    res.status(200).json(category.quiz);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const addQuizToCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const { question, options, correctAnswer } = req.body;

    if (!question || !options || options.length < 2 || !correctAnswer) {
      res.status(400).json({
        message:
          "Quiz must have a question, at least two options, and a correct answer.",
      });
      return;
    }

    const category = await JobCategory.findById(categoryId);
    if (!category) {
      res.status(404).json({ message: "Category not found." });
      return;
    }

    if (!category.quiz) category.quiz = [];

    category.quiz.push({ question, options, correctAnswer });
    await category.save();

    res.status(201).json({ message: "Quiz added successfully.", category });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const updateQuizInCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categoryId, quizId } = req.params;
    const { question, options, correctAnswer } = req.body;

    const category = await JobCategory.findById(categoryId);
    if (!category) {
      res.status(404).json({ message: "Category not found." });
      return;
    }

    const quiz = category.quiz.id(quizId);
    if (!quiz) {
      res.status(404).json({ message: "Quiz question not found." });
      return;
    }

    if (question) quiz.question = question;
    if (options) quiz.options = options;
    if (correctAnswer) quiz.correctAnswer = correctAnswer;

    await category.save();
    res.status(200).json({ message: "Quiz updated successfully.", category });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const deleteQuizFromCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categoryId, quizId } = req.params;

    const category = await JobCategory.findById(categoryId);
    if (!category) {
      res.status(404).json({ message: "Category not found." });
      return;
    }

    const quiz = category.quiz.id(quizId);
    if (!quiz) {
      res.status(404).json({ message: "Quiz question not found." });
      return;
    }

    quiz.deleteOne();
    await category.save();

    res
      .status(200)
      .json({ message: "Quiz question deleted successfully.", category });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
