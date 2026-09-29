import { Request, Response } from "express";
import mongoose from "mongoose";
import JobApplication from "../../../models/hr/job/job-application.model";

export const addQuizAttempt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { quizScore, quizStartedAt } = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    // Validate data (score 0 allowed)
    if (quizScore == null || !quizStartedAt) {
      res
        .status(400)
        .json({ message: "quizScore and quizStartedAt are required." });
      return;
    }

    const application = await JobApplication.findById(id).populate({
      path: "jobId",
      populate: { path: "category", select: "name" },
    });

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    const job: any = application.jobId;
    if (!job || typeof job.totalNumberOfQuestions !== "number") {
      res
        .status(400)
        .json({ message: "Job or total number of questions not found." });
      return;
    }

    const totalQuestions = job.totalNumberOfQuestions;

    console.log("Total: ",totalQuestions)

    // Score calculations
    const score = Number(quizScore);
    const percentage = Math.min((score / totalQuestions) * 100, 100);
    const status: "Passed" | "Failed" = percentage >= 80 ? "Passed" : "Failed";

    // Time handling
    const start = new Date(quizStartedAt);
    const end = new Date();

    if (isNaN(start.getTime())) {
      res.status(400).json({ message: "Invalid quizStartedAt format." });
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const totalMinutes = Math.max(Math.floor(diffMs / 60000), 0);
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");

    const timeConsumed = `${hours}:${minutes}`;

    const newAttempt = {
      jobId: job._id,
      jobTitle: job.title,
      category: job.category?.name || "Uncategorized",
      startedAt: start,
      submittedAt: end,
      timeConsumed,
      score,
      percentage: Number(percentage.toFixed(2)),
      status,
    };

    // Add to attempts
    application.quizAttempts = application.quizAttempts || [];
    application.quizAttempts.push(newAttempt);
    await application.save();

    res.status(200).json({
      message: "Quiz attempt added successfully.",
      quizAttempts: application.quizAttempts,
    });
  } catch (error: any) {
    console.error("Error adding quiz attempt:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
