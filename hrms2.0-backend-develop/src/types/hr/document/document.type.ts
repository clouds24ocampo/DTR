// Document types
export const documentTypes = [
  "Standard Operating Procedures (SOPs)",
  "Company Bylaws",
  "Operating Agreements",
  "Non-Disclosure Agreements (NDAs)",
  "Employment Contracts",
  "Business Plans",
  "Financial Records",
  "Business Reports",
  "User Guides or Manuals",
  "Contracts and Agreements",
  "Process Narratives",
  "Work Instructions and Specifications",
  "Process Maps and Flowcharts",
  "Checklists and Quick Reference Guides",
  "Mediation or Escalation Documentation",
  "Training Manuals and Tutorials",
] as const;

export type DocumentType = (typeof documentTypes)[number];

// Create document input interface (NO documentContent)
export interface CreateDocumentInput {
  documentName: string;
  documentType: DocumentType;
}
