import mongoose, { Document, Schema } from "mongoose";

export interface IKPI {
    name: string;
    description?: string;
    targetValue: number;
    actualValue?: number;
    weight: number; // Percentage weight (0-100)
    rating?: number; // 1-5 scale
    comments?: string;
}

export interface IPerformanceReview extends Document {
    employee: mongoose.Schema.Types.ObjectId;
    employeeName: string;
    reviewer: mongoose.Schema.Types.ObjectId;
    reviewerName: string;

    reviewPeriod: {
        start: Date;
        end: Date;
        label: string; // e.g., "Q1 2024", "Annual 2024"
    };

    kpis: IKPI[];

    // Overall metrics
    overallScore?: number; // 0-100 or 1-5 scale
    overallRating?: "outstanding" | "exceeds" | "meets" | "needs-improvement" | "unsatisfactory";

    // Comments
    strengths?: string;
    areasForImprovement?: string;
    goals?: string; // Goals for next period
    reviewerComments?: string;
    employeeComments?: string; // Employee self-assessment or response

    status: "draft" | "pending" | "completed" | "acknowledged";

    // Acknowledgment tracking
    acknowledgedAt?: Date;
    acknowledgedBy?: mongoose.Schema.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const KPISchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    targetValue: { type: Number, required: true },
    actualValue: { type: Number },
    weight: { type: Number, required: true, min: 0, max: 100 },
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
}, { _id: false });

const PerformanceReviewSchema: Schema = new Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        employeeName: { type: String, required: true },
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reviewerName: { type: String, required: true },

        reviewPeriod: {
            start: { type: Date, required: true },
            end: { type: Date, required: true },
            label: { type: String, required: true },
        },

        kpis: { type: [KPISchema], default: [] },

        overallScore: { type: Number, min: 0 },
        overallRating: {
            type: String,
            enum: ["outstanding", "exceeds", "meets", "needs-improvement", "unsatisfactory"],
        },

        strengths: { type: String },
        areasForImprovement: { type: String },
        goals: { type: String },
        reviewerComments: { type: String },
        employeeComments: { type: String },

        status: {
            type: String,
            enum: ["draft", "pending", "completed", "acknowledged"],
            default: "draft",
        },

        acknowledgedAt: { type: Date },
        acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// Compound index to help with queries
PerformanceReviewSchema.index({ employee: 1, "reviewPeriod.start": 1 });
PerformanceReviewSchema.index({ reviewer: 1 });
PerformanceReviewSchema.index({ status: 1 });

const PerformanceReview = mongoose.models.PerformanceReview ||
    mongoose.model<IPerformanceReview>("PerformanceReview", PerformanceReviewSchema);

export default PerformanceReview;
