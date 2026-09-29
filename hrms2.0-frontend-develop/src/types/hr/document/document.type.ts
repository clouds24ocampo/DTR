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
];

export interface DocumentType {
  _id: string;
  title: string;
  content: string;
  dateDrafted: string;
  seriesYear: number;
  documentType: string;
  createdAt: string;
  updatedAt: string;
}