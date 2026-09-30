import { Schema, model, models, Document as MongooseDocument } from "mongoose";

export interface IDocument extends MongooseDocument {
  documentType: string;
  title: string;
  content: string;
  dateDrafted: Date;
  seriesYear: string;
}

const DocumentSchema = new Schema<IDocument>({
  documentType: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  dateDrafted: { type: Date, required: true },
  seriesYear: { type: String, required: true },
});

// Add text index for efficient search
DocumentSchema.index({
  title: "text",
  content: "text",
});

const DocumentModel = models.Document || model<IDocument>("Document", DocumentSchema);

export default DocumentModel;
