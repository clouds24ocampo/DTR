import { Request, Response } from "express";
import Document from "../../../models/hr/document/document.model";

export const getDocuments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const documents = await Document.find();
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const addDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, content, dateDrafted, seriesYear, documentType } = req.body;

    const document = new Document({
      title,
      content,
      dateDrafted,
      seriesYear,
      documentType,
    });
    await document.save();

    res.status(201).json({
      message: "Document created successfully.",
      document,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        message:
          "Duplicate document. A document with the same unique field already exists.",
        error: error.message,
      });
      return;
    }
    res.status(400).json({
      message: "Validation error",
      error: error.message,
    });
    return;
  }
};

export const updateDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const document = await Document.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      res.status(404).json({ message: "Document not found." });
      return;
    }

    res.status(200).json({
      message: "Document updated successfully",
      document,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await Document.findByIdAndDelete(id);
    res.status(200).json({ message: "Document deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
