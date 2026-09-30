import mongoose, { Schema } from "mongoose";
import { IDepartment } from "src/types/global/department/department.type";

const DepartmentSchema: Schema<IDepartment> = new Schema(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    description: { type: String, default: "" },
    head: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    location: { type: String, default: "" },
    status: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Add text index for efficient search
DepartmentSchema.index({
  name: "text",
  description: "text",
});

const Department =
  mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
