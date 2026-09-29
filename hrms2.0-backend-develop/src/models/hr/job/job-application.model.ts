import mongoose, { Schema, model, Document } from "mongoose";

interface QuizAttempt {
  jobTitle: any;
  category: any;
  startedAt: Date;
  submittedAt: Date;
  timeConsumed: string; // HH:MM
  score: number;
  percentage: number;
  status: "Passed" | "Failed";
}

interface QueueStatus {
  jobTitle: any;
  category: any;
  applicantId: string;
  status: string;
  timeStamp: Date;
}

export interface IJobApplication extends Document {
  jobId: mongoose.Schema.Types.ObjectId;
  firstName: string;
  middleName?: string;
  lastName: string;
  nameExtension?: string;
  birthday: Date;
  gender:
    | "Male"
    | "Female"
    | "Transgender"
    | "Non-Binary"
    | "Genderqueer"
    | "Genderfluid"
    | "Agender"
    | "Intersex"
    | "Gay"
    | "Lesbian"
    | "Bisexual"
    | "Pansexual"
    | "Asexual"
    | "Queer"
    | "Two-Spirit"
    | "Questioning"
    | "Prefer not to say";
  age: number;
  civilStatus: "Single" | "Married" | "Widowed" | "Divorced";
  address: string;
  email: string;
  phoneNumber: string;
  citizenship: string;
  placeOfBirth: string;
  reference: Array<{
    name: string;
    relationship: string;
    contactNumber: string;
  }>;
  education: Array<{
    level: string;
    schoolName: string;
    fromYear: number;
    toYear: number;
    degree: string;
  }>;
  workExperience: Array<{
    companyName: string;
    companyLocation: string;
    position: string;
    fromYear: number;
    toYear: number;
    reasonForLeaving: string;
  }>;
  majorSkills: Array<{ skill: string }> | string[];
  uploadedFiles: Array<{
    requirementName: string;
    reqFile: string;
  }>;
  uploadedJobOfferLetter: string;
  profileImage: string;
  status: "Unreviewed" | "Scheduled" | "Accepted" | "Rejected" | "Pending";
  rejectionReason?: string;
  interviewSchedule?: {
    date: Date;
    time: string;
    type: "Video-Call" | "In-Person" | "Phone-Interview" | "Panel-Interview";
    location: string;
    requirementsToBring?: string[];
  };
  interviewStatus?: "Accepted" | "Rejected";
  applicantId: string;
  interviewRejectionReason?: string;
  hiringDate?: Date;
  hiringMessage?: string;
  quizAttempts?: QuizAttempt[];
  queueStatus?: QueueStatus[];
  submittedAt: Date;
}

const InterviewScheduleSchema = new Schema({
  date: { type: Date, required: true },
  time: { type: String, required: true },
  type: {
    type: String,
    enum: ["Video-Call", "In-Person", "Phone-Interview", "Panel-Interview"],
    required: true,
  },
  location: { type: String, required: true },
  requirementsToBring: { type: [String], default: [] },
});

const JobApplicationSchema = new Schema<IJobApplication>({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  applicantId: { type: String, required: false },
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  nameExtension: { type: String },
  birthday: { type: Date, required: false },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  age: { type: Number, required: true },
  civilStatus: { type: String, required: false },
  address: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  citizenship: { type: String, required: true },
  placeOfBirth: { type: String, required: true },

  reference: [
    {
      name: { type: String },
      relationship: { type: String },
      contactNumber: { type: String },
    },
  ],
  education: [
    {
      level: { type: String },
      schoolName: { type: String },
      fromYear: { type: String },
      toYear: { type: String },
      degree: { type: String },
    },
  ],
  workExperience: [
    {
      companyName: { type: String },
      companyLocation: { type: String },
      position: { type: String },
      fromYear: { type: String },
      toYear: { type: String },
      reasonForLeaving: { type: String },
    },
  ],
  majorSkills: [{ type: String }],
  quizAttempts: {
    type: [
      {
        jobId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Job",
          required: false,
        },
        jobTitle: { type: String, required: false },
        category: { type: String, required: false },
        startedAt: { type: Date, required: true },
        submittedAt: { type: Date, required: true },
        timeConsumed: {
          type: String,
          validate: {
            validator: (v: string) => /^\d{2,}:[0-5]\d$/.test(v),
            message: "Invalid time format. Use HH:MM (e.g., 48:00).",
          },
        },
        score: { type: Number, required: true },
        percentage: { type: Number, min: 0, max: 100, required: true },
        status: { type: String, enum: ["Passed", "Failed"], required: true },
      },
    ],
    default: [],
  },

  uploadedFiles: [
    {
      requirementName: { type: String },
      reqFile: { type: String },
    },
  ],

  uploadedJobOfferLetter: { type: String, required: false },

  queueStatus: {
    type: [
      {
        jobTitle: {
          type: mongoose.Schema.Types.Mixed,
          required: false,
        },
        category: {
          type: mongoose.Schema.Types.Mixed,
          required: false,
        },
        applicantId: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          required: true,
        },
        timeStamp: {
          type: Date,
          required: true,
        },
      },
    ],
  },

  profileImage: { type: String, required: false },

  status: {
    type: String,
    enum: [
      "Unreviewed",
      "Reviewed",
      "Scheduled",
      "Accepted",
      "Rejected",
      "Pending",
    ],
    default: "Unreviewed",
  },
  rejectionReason: { type: String },

  interviewSchedule: InterviewScheduleSchema,
  interviewStatus: { type: String, enum: ["Accepted", "Rejected"] },
  interviewRejectionReason: { type: String },
  hiringDate: { type: Date },
  hiringMessage: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

// Using an index to prevent duplicate applications for the same job and applicant
JobApplicationSchema.index(
  {
    jobId: 1,
    firstName: 1,
    middleName: 1,
    lastName: 1,
    nameExtension: 1,
  },
  { unique: true }
);

JobApplicationSchema.methods.populateCategory = async function () {
  // Use populate to fetch category related to the jobId from the Job model
  const job = await this.populate("jobId").execPopulate();
  if (job) {
    // Assuming job has category field (referencing JobCategory)
    const category = await job.jobId.populate("category").execPopulate();

    // Ensure attempt is typed as QuizAttempt
    this.quizAttempts.forEach((attempt: QuizAttempt) => {
      attempt.category = category.name; // Populate category for each quiz attempt
    });
  }
};

export default model<IJobApplication>("JobApplication", JobApplicationSchema);
