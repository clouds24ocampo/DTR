import { Request, Response } from "express";
import mongoose from "mongoose";
import Job from "../../../models/hr/job/job.model";
import JobCategory from "../../../models/hr/job/job-category.model";
import uploadImageAndFile from "src/utils/global/uploadImageAndFile";
import path from "path";

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, location, employmentType } = req.query;

    const filter: any = {};
    if (title) filter.title = { $regex: title, $options: "i" };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (employmentType) filter.employmentType = employmentType;

    const jobs = await Job.find(filter);
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const getJobById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Job ID format." });
      return;
    }

    const job = await Job.findById(id);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const getJobApplicants = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Job ID format." });
      return;
    }

    const job = await Job.findById(id).populate({
      path: "applicants.application",
      select: "firstName lastName email uploadedFiles status submittedAt",
    });

    if (!job) {
      res.status(404).json({ message: "Job not found." });
      return;
    }

    const formatted = job.applicants.map(({ application, quizAttempt }) => ({
      applicant: application,
      quizAttemptId: quizAttempt,
    }));

    res.status(200).json({
      jobTitle: job.title,
      applicants: formatted,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      qualifications,
      location,
      employmentType,
      category,
      jobStatus,
      timeDuration,
      totalNumberOfQuestions,
      fileType,
      customRequirements,
      image,
    } = req.body;

    const allowedFileTypes = ["image", "file"];

    if (
      !title ||
      !description ||
      !qualifications ||
      !location ||
      !employmentType ||
      !category ||
      !image ||
      !jobStatus
    ) {
      res.status(400).json({
        message: "All required fields must be provided.",
      });
      return;
    }

    let parsedRequirements: { name: string; fileType: string }[] = [];

    if (customRequirements) {
      try {
        if (typeof customRequirements === "string") {
          parsedRequirements = JSON.parse(customRequirements);
        } else if (Array.isArray(customRequirements)) {
          parsedRequirements = customRequirements;
        } else {
          throw new Error("Invalid format");
        }

        // Validation block
        const names = parsedRequirements.map((r) => r.name);
        const hasDuplicates = new Set(names).size !== names.length;
        if (hasDuplicates) {
          res
            .status(400)
            .json({ message: "Duplicate requirement names found." });
          return;
        }

        const invalidCustomTypes = parsedRequirements.filter(
          (r) =>
            !r.name ||
            !r.fileType ||
            !allowedFileTypes.includes(r.fileType.toLowerCase())
        );
        if (invalidCustomTypes.length > 0) {
          res.status(400).json({
            message: `Missing or invalid fields in: ${invalidCustomTypes
              .map((r) => r.name || "Unnamed")
              .join(", ")}. Allowed fileTypes: image, file.`,
          });
          return;
        }
      } catch (err) {
        res.status(400).json({
          message:
            "Invalid format for customRequirements. Must be array or JSON string.",
        });
        return;
      }
    }

    const categoryDoc = await JobCategory.findOne({ name: category });
    if (!categoryDoc) {
      res.status(400).json({ message: `Category '${category}' not found.` });
      return;
    }

    const newJob = new Job({
      title,
      description,
      qualifications,
      location,
      employmentType,
      category: categoryDoc._id,
      jobStatus,
      timeDuration,
      totalNumberOfQuestions,
      fileType,
      customRequirements,
      image: null,
    });

    await newJob.save();

    if (image) {
      newJob.image = image;
      await newJob.save();
    }

    res.status(201).json({ message: "Job posted successfully", job: newJob });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Job ID format." });
      return;
    }

    const existingJob = await Job.findById(id);
    if (!existingJob) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    if (
      updateData.timeDuration &&
      !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updateData.timeDuration)
    ) {
      res.status(400).json({
        message: "Invalid timeDuration format. Use HH:MM (e.g., 01:30).",
      });
      return;
    }

    if (
      updateData.totalNumberOfQuestions &&
      isNaN(updateData.totalNumberOfQuestions)
    ) {
      res
        .status(400)
        .json({ message: "totalNumberOfQuestions must be a number." });
      return;
    }

    const updatedJob = await Job.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res
      .status(200)
      .json({ message: "Job updated successfully.", job: updatedJob });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid Job ID format." });
      return;
    }
    const job = await Job.findByIdAndDelete(id);

    res.status(200).json({ message: "Job deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
