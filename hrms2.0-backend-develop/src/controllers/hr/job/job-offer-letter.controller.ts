import { Request, response, Response } from "express";
import JobApplication from "../../../models/hr/job/job-application.model";
import mongoose from "mongoose";
import path from "path";
import uploadImageAndFile from "src/utils/global/uploadImageAndFile";
import { sendAcceptedEmail } from "../../../utils/global/mail/acceptedApplicantEmail";

export const uploadJobOfferLetter = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const file = req.body.uploadedJobOfferLetter;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const application = await JobApplication.findById(id);
    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    application.uploadedJobOfferLetter = file;
    await application.save();

    //accept candidate
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Application ID format." });
      return;
    }

    const applicationData = await JobApplication.findById(id);

    const jobTitle: string =
      applicationData?.quizAttempts
        ?.map((attempt) => `${attempt.jobTitle}`)
        .join(", ") || "";

    const updateApplication = await JobApplication.findByIdAndUpdate(
      id,
      { status: "Accepted" },
      { new: true }
    );

    await sendAcceptedEmail(
      applicationData?.email ?? "",
      application?.firstName ?? "",
      application?.lastName ?? "",
      jobTitle ?? "",
      application.uploadedJobOfferLetter
    );

    if (!updateApplication) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    console.log(application.uploadedJobOfferLetter);

    res
      .status(200)
      .json({ message: "PDF uploaded successfully.", application });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
