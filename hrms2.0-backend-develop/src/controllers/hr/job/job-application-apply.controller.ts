import { Request, Response } from "express";
import mongoose from "mongoose";
import JobApplication from "../../../models/hr/job/job-application.model";
import Job from "../../../models/hr/job/job.model";
import uploadImageAndFile from "src/utils/global/uploadImageAndFile";
import Category from "../../../models/hr/job/job-category.model";

const parseJSONField = <T>(value: any): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Invalid JSON format");
  }
};

export const applyForJob = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      jobId,
      firstName,
      middleName,
      lastName,
      nameExtension,
      birthday,
      gender,
      age,
      civilStatus,
      address,
      email,
      phoneNumber,
      citizenship,
      placeOfBirth,
      profileImage,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.status(400).json({ message: "Invalid Job ID format." });
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ message: "Job not found." });
      return;
    }

    const reference = parseJSONField(req.body.reference) || [];
    const education = parseJSONField(req.body.education) || [];
    const workExperience = parseJSONField(req.body.workExperience) || [];

    // ✅ Fix majorSkills parsing
    const majorSkillsParsed = parseJSONField(req.body.majorSkills) || [];
    const majorSkills = majorSkillsParsed.map(
      (item: any) => item.skill || item
    );

    // ✅ Prevent duplicate name submission in same job
    const existingApplication = await JobApplication.findOne({
      jobId,
      firstName,
      middleName,
      lastName,
      nameExtension,
    });

    let applicantId;
    if (!existingApplication) {
      const latest = await JobApplication.findOne({})
        .sort({ applicantId: -1 })
        .lean();

      const lastId = latest?.applicantId || "25-000000";
      const nextNumber = parseInt(lastId.split("-")[1], 10) + 1;
      applicantId = `25-${String(nextNumber).padStart(6, "0")}`;
    }

    const applicationData = {
      jobId,
      firstName,
      middleName,
      lastName,
      nameExtension,
      birthday,
      gender,
      age,
      civilStatus,
      citizenship,
      placeOfBirth,
      address,
      email,
      phoneNumber,
      profileImage,
      reference,
      education,
      workExperience,
      majorSkills,
      ...(applicantId && { applicantId }),
    };

    const application = existingApplication
      ? await JobApplication.findByIdAndUpdate(
          existingApplication._id,
          applicationData,
          { new: true }
        )
      : await JobApplication.create(applicationData);

    res.status(201).json({
      message: existingApplication
        ? "Application updated successfully."
        : "Application submitted successfully.",
      application,
    });
  } catch (error: any) {
    console.error("applyForJob Error:", error);

    if (error.code === 11000) {
      res.status(409).json({
        message:
          "Applicant with the same full name already exists for this job.",
      });
      return;
    }

    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const getApplicantDetailsById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.query.id as string; // Extract from query parameters

    if (!id) {
      res.status(400).json({ message: "Applicant ID is required." });
      return;
    }

    const application = await JobApplication.findById(id);

    if (!application) {
      res.status(404).json({ message: "Applicant not found." });
      return;
    }

    const job = await Job.findById(application.jobId);
    let jobTitle = null;
    let jobCategoryName = null;

    if (job) {
      jobTitle = job.title;
      if (
        job.category &&
        mongoose.Types.ObjectId.isValid(job.category.toString())
      ) {
        const category = await Category.findById(job.category);
        if (category) {
          jobCategoryName = category.name;
        }
      }
    }

    res.status(200).json({
      application,
      jobDetails: {
        jobTitle,
        jobCategory: jobCategoryName,
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
