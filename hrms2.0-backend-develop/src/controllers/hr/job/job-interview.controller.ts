import { Request, Response } from "express";
import mongoose from "mongoose";
import { sendInterviewSchedule } from "src/utils/global/mail/scheduleApplicantEmail";
import JobApplication from "../../../models/hr/job/job-application.model";

export const scheduleInterview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, time, type, location, requirementsToBring } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const application = await JobApplication.findById(id);
    const jobTitle: string =
      application?.quizAttempts
        ?.map((attempt) => `${attempt.jobTitle}`)
        .join(", ") || "";

    const category: string =
      application?.quizAttempts
        ?.map((attempt) => `${attempt.category}`)
        .join(", ") || "";
    console.log(jobTitle);

    console.log(application);
    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    if (!date || !time || !type || !location) {
      res
        .status(400)
        .json({ message: "Date, time, type, and location are required." });
      return;
    }

    application.status = "Scheduled";
    application.interviewSchedule = {
      date,
      time,
      type,
      location,
      requirementsToBring,
    };
    await application.save();

    try {
      await sendInterviewSchedule(
        application.applicantId,
        application.email,
        application.firstName,
        application.lastName,
        type,
        location,
        date,
        time,
        jobTitle,
        requirementsToBring
        //category
      );
    } catch (emailErr) {
      console.warn(
        "Failed to send confirmation email:",
        (emailErr as Error).message
      );
    }

    res.status(200).json({
      message: "Interview scheduled successfully.",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const finalizeInterview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      interviewStatus,
      interviewRejectionReason,
      hiringDate,
      hiringMessage,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const application = await JobApplication.findById(id);
    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    if (!application.interviewSchedule) {
      res.status(400).json({
        message: "Interview must be scheduled first before finalizing.",
      });
      return;
    }

    if (!interviewStatus) {
      res.status(400).json({
        message: "Interview status (Accepted or Rejected) is required.",
      });
      return;
    }

    if (interviewStatus === "Rejected" && !interviewRejectionReason) {
      res.status(400).json({
        message: "Rejection reason is required when rejecting an applicant.",
      });
      return;
    }

    if (interviewStatus === "Accepted" && !hiringDate) {
      res.status(400).json({
        message: "Hiring date is required when accepting an applicant.",
      });
      return;
    }

    application.interviewStatus = interviewStatus;

    if (interviewStatus === "Rejected") {
      application.interviewRejectionReason = interviewRejectionReason;
      application.status = "Rejected";
    } else {
      application.hiringDate = new Date(hiringDate);
      application.hiringMessage = hiringMessage;
      application.status = "Accepted";
    }

    await application.save();

    res.status(200).json({
      message: "Interview status updated successfully.",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
