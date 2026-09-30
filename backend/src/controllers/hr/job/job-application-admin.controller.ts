import { Request, Response } from "express";
import { sendJobApplicationConfirmation } from "src/utils/global/mail/jobApplicationEmail";
import { sendPendingEmail } from "src/utils/global/mail/pendingApplicantEmail";
import mongoose from "mongoose";
import JobApplication from "../../../models/hr/job/job-application.model";
import uploadImageAndFile from "src/utils/global/uploadImageAndFile";
import path from "path";
import { sendRejectionEmail } from "src/utils/global/mail/rejectedApplicantEmail";
import { sendAcceptedEmail } from "src/utils/global/mail/acceptedApplicantEmail";

export const getAllApplicantsForAllJobs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const applications = await JobApplication.find().populate("jobId");

    if (!applications || applications.length === 0) {
      res.status(404).json({ message: "No applicants found." });
      return;
    }

    res.status(200).json({
      message: "All applicants retrieved successfully.",
      applications,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getAllApplicants = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.status(400).json({ message: "Invalid Job ID format." });
      return;
    }

    const applications = await JobApplication.find({ jobId }).populate("jobId");

    if (!applications || applications.length === 0) {
      res.status(404).json({ message: "No applicants found for this job." });
      return;
    }

    res
      .status(200)
      .json({ message: "Applicants retrieved successfully.", applications });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const uploadApplicationFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Request body:", req.body);
    const { id } = req.params;
    let { requirementName, reqFile } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    // Normalize to arrays
    const requirementNamesArray = Array.isArray(requirementName)
      ? requirementName.map(String)
      : requirementName
      ? [String(requirementName)]
      : [];

    const reqFileArray = Array.isArray(reqFile)
      ? reqFile.map(String)
      : reqFile
      ? [String(reqFile)]
      : [];

    // Ensure data alignment
    if (requirementNamesArray.length === 0 || reqFileArray.length === 0) {
      res
        .status(400)
        .json({ message: "No files or requirement names provided." });
      return;
    }

    if (requirementNamesArray.length !== reqFileArray.length) {
      res
        .status(400)
        .json({ message: "Mismatch between requirement names and files." });
      return;
    }

    // Find the application
    const application = await JobApplication.findById(id).populate("jobId");
    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    const job: any = application.jobId;
    if (!job || !Array.isArray(job.customRequirements)) {
      res
        .status(400)
        .json({ message: "Job does not have custom requirements." });
      return;
    }

    // Build requirement map
    const requirementMap: Record<string, "image" | "file"> = {};
    for (const reqItem of job.customRequirements) {
      const type = reqItem.fileType || job.fileType || "file";
      requirementMap[reqItem.name] = type.toLowerCase();
    }

    // Validate requirements
    const invalidRequirements = requirementNamesArray.filter(
      (name) => !(name in requirementMap)
    );
    if (invalidRequirements.length > 0) {
      res.status(400).json({
        message: `Invalid requirements for this job: ${invalidRequirements.join(
          ", "
        )}`,
      });
      return;
    }

    // Pair requirement name with corresponding file URL/string
    const uploadedFiles = requirementNamesArray.map((name, index) => ({
      requirementName: name,
      reqFile: reqFileArray[index],
    }));

    // Merge uploaded files into the application record
    application.uploadedFiles.push(...uploadedFiles);
    await application.save();

    // Try sending confirmation email (non-blocking failure)
    try {
      await sendJobApplicationConfirmation(
        application.applicantId,
        application.email,
        application.firstName,
        application.lastName,
        job.title
      );
    } catch (emailErr) {
      console.warn(
        "Failed to send confirmation email:",
        (emailErr as Error).message
      );
    }

    res.status(200).json({
      message: "Files uploaded successfully.",
      uploadedFiles,
      application,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const pendingApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const applicationData = await JobApplication.findById(id);

    const jobTitle: string =
      applicationData?.quizAttempts
        ?.map((attempt) => `${attempt.jobTitle}`)
        .join(", ") || "";

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { status: "Pending" },
      { new: true }
    );

    console.log(applicationData);
    console.log(jobTitle);

    await sendPendingEmail(
      applicationData?.applicantId ?? "",
      applicationData?.email ?? "",
      application?.firstName ?? "",
      application?.lastName ?? "",
      jobTitle ?? ""
    );

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    res
      .status(200)
      .json({ message: "Application marked as reviewed.", application });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const acceptedApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const applicationData = await JobApplication.findById(id);

    const jobTitle: string =
      applicationData?.quizAttempts
        ?.map((attempt) => `${attempt.jobTitle}`)
        .join(", ") || "";

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { status: "Accepted" },
      { new: true }
    );

    await sendAcceptedEmail(
      applicationData?.email ?? "",
      application?.firstName ?? "",
      application?.lastName ?? "",
      jobTitle ?? "",
      jobTitle ?? ""
    );

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    res
      .status(200)
      .json({ message: "Application marked as reviewed.", application });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const rejectApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    if (!rejectionReason) {
      res.status(400).json({ message: "Rejection reason is required." });
      return;
    }

    const applicationData = await JobApplication.findById(id);

    const jobTitle: string =
      applicationData?.quizAttempts
        ?.map((attempt) => `${attempt.jobTitle}`)
        .join(", ") || "";

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { status: "Rejected", rejectionReason },
      { new: true }
    );

    await sendRejectionEmail(
      applicationData?.email ?? "",
      application?.firstName ?? "",
      application?.lastName ?? "",
      jobTitle ?? ""
    );

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    res
      .status(200)
      .json({ message: "Application rejected successfully.", application });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const queueStatusPendingApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { $set: { "queueStatus.0.status": "Pending" } },
      { new: true }
    );

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    res
      .status(200)
      .json({ message: "Application marked as reviewed.", application });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const queueStatusDoneApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { $set: { "queueStatus.0.status": "Done" } },
      { new: true }
    );

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    res
      .status(200)
      .json({ message: "Application marked as reviewed.", application });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
