import Document from "src/models/hr/document/document.model";
import { CreateDocumentInput } from "src/types/hr/document/document.type";

// Function to check if a document with the same name already exists
export async function isDuplicateDocumentName(
  documentName: string
): Promise<boolean> {
  const existing = await Document.findOne({ documentName }).exec();
  return existing !== null;
}

/*
 * Function to create document
 */
export async function createDocumentService(data: CreateDocumentInput) {
  const duplicate = await isDuplicateDocumentName(data.documentName);
  if (duplicate) {
    throw new Error("Document with this name already exists.");
  }

  const newDocument = new Document({
    documentName: data.documentName,
    documentType: data.documentType,
  });

  await newDocument.save();
  return newDocument;
}
