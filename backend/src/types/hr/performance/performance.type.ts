import { Types } from "mongoose";

export type PerformanceRating = "outstanding" | "exceeds" | "meets" | "needs-improvement" | "unsatisfactory";
export type PerformanceStatus = "draft" | "pending" | "completed" | "acknowledged";

export interface IKPI {
    name: string;
    description?: string;
    targetValue: number;
    actualValue?: number;
    weight: number; // Percentage weight (0-100)
    rating?: number; // 1-5 scale
    comments?: string;
}

export interface IReviewPeriod {
    start: Date | string;
    end: Date | string;
    label: string; // e.g., "Q1 2024", "Annual 2024"
}

export interface IPerformanceReview {
    employee: Types.ObjectId | string;
    employeeName: string;
    reviewer: Types.ObjectId | string;
    reviewerName: string;

    reviewPeriod: IReviewPeriod;

    kpis: IKPI[];

    // Overall metrics
    overallScore?: number; // 0-100 or 1-5 scale
    overallRating?: PerformanceRating;

    // Comments
    strengths?: string;
    areasForImprovement?: string;
    goals?: string; // Goals for next period
    reviewerComments?: string;
    employeeComments?: string; // Employee self-assessment or response

    status: PerformanceStatus;

    // Acknowledgment tracking
    acknowledgedAt?: Date | string;
    acknowledgedBy?: Types.ObjectId | string;

    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export type IPerformanceReviewDoc = IPerformanceReview & { _id: Types.ObjectId | string };

// API Request/Response Types
export interface CreatePerformanceReviewInput {
    employeeId: string;
    employeeName: string;
    reviewerId: string;
    reviewerName: string;
    reviewPeriod: IReviewPeriod;
    kpis?: IKPI[];
}

export interface UpdatePerformanceReviewInput {
    kpis?: IKPI[];
    overallScore?: number;
    overallRating?: PerformanceRating;
    strengths?: string;
    areasForImprovement?: string;
    goals?: string;
    reviewerComments?: string;
    employeeComments?: string;
    status?: PerformanceStatus;
}

export interface GetPerformanceReviewsFilterInput {
    employeeId?: string;
    reviewerId?: string;
    status?: PerformanceStatus;
    periodStart?: string;
    periodEnd?: string;
    page?: number;
    pageSize?: number;
}

export type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export type PerformanceReviewListResponse = ApiEnvelope<{
    items: IPerformanceReviewDoc[];
    page: number;
    pageSize: number;
    total: number;
}>;

export type PerformanceReviewResponse = ApiEnvelope<IPerformanceReviewDoc>;
