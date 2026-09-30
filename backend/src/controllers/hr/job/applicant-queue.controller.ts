import { Request, Response } from "express";
import JobApplication from "../../../models/hr/job/job-application.model";

export const addToQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.body;

    if (!id) {
      res.status(400).json({ message: "Applicant ID is required." });
      return;
    }

    // Find by applicantId, not by Mongo _id
    const application = await JobApplication.findOne({ applicantId: id }).populate({
      path: "jobId",
      populate: { path: "category", select: "name" },
    });

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    const job: any = application.jobId;
    if (!job || typeof job.totalNumberOfQuestions !== "number") {
      res.status(400).json({ message: "Job or total number of questions not found." });
      return;
    }

    // Prepare queue entry
    const queueEntry = {
      jobId: job._id,
      jobTitle: job.title,
      category: job.category?.name || "Uncategorized",
      applicantId: id,
      status: "Queued",
      timeStamp: new Date(),
    };

    // Ensure queueStatus exists and is an array
    if (!Array.isArray(application.queueStatus)) {
      application.queueStatus = [];
    }

    // Push to queueStatus
    application.queueStatus.push(queueEntry);

    // Save to database
    await application.save();

    res.status(200).json({
      message: "Applicant queued successfully.",
      queueStatus: application.queueStatus,
    });
  } catch (error: any) {
    console.error("Error in addToQueue:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
