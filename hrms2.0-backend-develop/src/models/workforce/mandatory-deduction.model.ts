import mongoose, { Document, Schema } from "mongoose";

interface ICustomPercentages {
  [key: string]: number;
}

interface IMandatoryDeduction extends Document {
  sss: number;
  philhealth: number;
  pagibig: number;
  customPercentages?: ICustomPercentages;
}

const mandatoryDeductionSchema = new Schema<IMandatoryDeduction>({
  sss: { type: Number, required: true, default: 0 },
  philhealth: { type: Number, required: true, default: 0 },
  pagibig: { type: Number, required: true, default: 0 },
  customPercentages: { type: Map, of: Number, default: {} },
});

const MandatoryDeduction = mongoose.model<IMandatoryDeduction>(
  "MandatoryDeduction",
  mandatoryDeductionSchema
);

export default MandatoryDeduction;
