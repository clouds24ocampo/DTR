import { Request, Response } from "express";
import JobCategory from "../../../models/hr/job/job-category.model";
import Job from "../../../models/hr/job/job.model";
import JobApplication from "../../../models/hr/job/job-application.model";

export const getApplicantsPerCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Fetch all job categories
    const categories = await JobCategory.find();

    const applicantsPerCategory = await Promise.all(
      categories.map(async (category) => {
        // Find all jobs associated with the current category
        const jobs = await Job.find({ category: category._id });

        // Find and count applicants for each job
        let applicantsCount = 0;
        for (const job of jobs) {
          applicantsCount += await JobApplication.countDocuments({ jobId: job._id });
        }

        return {
          categoryName: category.name,
          applicantsCount: applicantsCount,
          jobFiltered: jobs.length
        };
      })
    );

    res.status(200).json(applicantsPerCategory);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categories = await JobCategory.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const createCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: "Category name is required." });
      return;
    }

    const existingCategory = await JobCategory.findOne({ name });
    if (existingCategory) {
      res.status(400).json({ message: "Category already exists." });
      return;
    }

    const newCategory = new JobCategory({ name, quiz: [] });
    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully.",
      category: newCategory,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await JobCategory.findByIdAndDelete(id);
    res.status(200).json({ message: "Category deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
