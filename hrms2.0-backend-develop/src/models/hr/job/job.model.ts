import mongoose, { Schema, model } from "mongoose";

const JobSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  qualifications: { type: [String], required: true },
  location: { type: String, required: true },
  employmentType: {
    type: String,
    enum: ["Full-time", "Part-time", "Contract", "Internship"],
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobCategory",
    required: true,
  },
  jobStatus: { type: String, required: true },
  timeDuration: {
    type: String,
    validate: {
      validator: function (value: string) {
        // Matches HH:MM where HH = 00–23 and MM = 00–59
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: "Invalid time format. Use HH:MM (e.g., 01:30).",
    },
    required: false,
  },
  totalNumberOfQuestions: { type: Number, required: false },
  customRequirements: [
    {
      name: { type: String, required: true },
      fileType: { type: String, enum: ["image", "file"], required: true },
    },
  ],
  applicants: [
    {
      application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobApplication",
        required: true,
      },
      quizAttempt: { type: mongoose.Schema.Types.ObjectId, required: true },
    },
  ],

  image: { type: String, required: false },
  postedAt: { type: Date, default: Date.now },
});

// Add text index for efficient search
JobSchema.index({
  title: "text",
  description: "text",
  qualifications: "text",
});

export default model("Job", JobSchema);
