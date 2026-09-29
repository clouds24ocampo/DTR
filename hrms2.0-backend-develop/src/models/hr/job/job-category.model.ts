import { Schema, models, model } from "mongoose";

const QuizSchema = new Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true, minlength: 2 }],
  correctAnswer: { type: String, required: true },
});

const JobCategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  quiz: [QuizSchema],
});

const JobCategory =
  models.JobCategory || model("JobCategory", JobCategorySchema);
export default JobCategory;
