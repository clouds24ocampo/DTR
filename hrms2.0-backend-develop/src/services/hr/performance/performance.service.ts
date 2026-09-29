import PerformanceReview from "src/models/hr/performance/performance.model";
import User from "src/models/workforce/user.model";
import {
    CreatePerformanceReviewInput,
    IPerformanceReviewDoc,
    UpdatePerformanceReviewInput,
    PerformanceStatus,
} from "src/types/hr/performance/performance.type";
import { ServiceError } from "src/utils/global/error";

/* ----------------------------- Helpers ----------------------------- */

const isNonEmptyString = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length > 0;

/* ----------------------------- Error Wrapper ----------------------------- */

const wrapService = async <T>(
    fn: () => Promise<T>,
    defaultMsg: string
): Promise<T> => {
    try {
        return await fn();
    } catch (err) {
        if (err instanceof ServiceError) throw err;
        throw new ServiceError(defaultMsg, 500);
    }
};

/* ----------------------------- Services ----------------------------- */

export const createPerformanceReviewService = (
    payload: CreatePerformanceReviewInput
) =>
    wrapService(async () => {
        const empId = payload.employeeId || (payload as any).employee;
        const revId = payload.reviewerId || (payload as any).reviewer;

        // Validate required fields
        if (!isNonEmptyString(empId))
            throw new ServiceError("Employee ID is required", 400);
        if (!isNonEmptyString(revId))
            throw new ServiceError("Reviewer ID is required", 400);
        if (!payload.reviewPeriod || !payload.reviewPeriod.start || !payload.reviewPeriod.end)
            throw new ServiceError("Review period is required", 400);

        // Verify employee and reviewer exist
        const employee = await User.findById(empId).lean();
        if (!employee) throw new ServiceError("Employee not found", 404);

        const reviewer = await User.findById(revId).lean();
        if (!reviewer) throw new ServiceError("Reviewer not found", 404);

        const created = await PerformanceReview.create({
            ...payload,
            employee: empId,
            reviewer: revId,
            status: "draft",
            kpis: payload.kpis || [],
        });

        return created.toObject() as IPerformanceReviewDoc;
    }, "Failed to create performance review");

export const getAllPerformanceReviewsService = () =>
    wrapService(async () => {
        const docs = await PerformanceReview.find({})
            .sort({ createdAt: -1 })
            .lean();
        return docs as unknown as IPerformanceReviewDoc[];
    }, "Failed to fetch performance reviews");

export const getPerformanceReviewByIdService = (reviewId: string) =>
    wrapService(async () => {
        if (!isNonEmptyString(reviewId))
            throw new ServiceError("Review ID is required", 400);

        const doc = await PerformanceReview.findById(reviewId).lean();
        if (!doc) throw new ServiceError("Performance review not found", 404);

        return doc as unknown as IPerformanceReviewDoc;
    }, "Failed to fetch performance review");

export const getPerformanceReviewsByEmployeeService = (employeeId: string) =>
    wrapService(async () => {
        if (!isNonEmptyString(employeeId))
            throw new ServiceError("Employee ID is required", 400);

        const docs = await PerformanceReview.find({ employee: employeeId })
            .sort({ "reviewPeriod.start": -1 })
            .lean();

        return docs as unknown as IPerformanceReviewDoc[];
    }, "Failed to fetch performance reviews by employee");

export const getPerformanceReviewsByReviewerService = (reviewerId: string) =>
    wrapService(async () => {
        if (!isNonEmptyString(reviewerId))
            throw new ServiceError("Reviewer ID is required", 400);

        const docs = await PerformanceReview.find({ reviewer: reviewerId })
            .sort({ createdAt: -1 })
            .lean();

        return docs as unknown as IPerformanceReviewDoc[];
    }, "Failed to fetch performance reviews by reviewer");

export const updatePerformanceReviewService = (
    reviewId: string,
    patch: UpdatePerformanceReviewInput
) =>
    wrapService(async () => {
        if (!isNonEmptyString(reviewId))
            throw new ServiceError("Review ID is required", 400);
        if (!patch || typeof patch !== "object")
            throw new ServiceError("Patch payload is required", 400);

        const existing = await PerformanceReview.findById(reviewId).lean() as any;
        if (!existing) throw new ServiceError("Performance review not found", 404);

        // Don't allow updates if already acknowledged
        if (existing.status === "acknowledged")
            throw new ServiceError(
                "Cannot update an acknowledged review",
                400
            );

        const updated = await PerformanceReview.findByIdAndUpdate(
            reviewId,
            { $set: patch },
            { new: true, runValidators: true, lean: true }
        );

        if (!updated)
            throw new ServiceError("Failed to update performance review", 500);

        return updated as unknown as IPerformanceReviewDoc;
    }, "Failed to update performance review");

export const deletePerformanceReviewService = (reviewId: string) =>
    wrapService(async () => {
        if (!isNonEmptyString(reviewId))
            throw new ServiceError("Review ID is required", 400);

        const existing = await PerformanceReview.findById(reviewId).lean() as any;
        if (!existing) throw new ServiceError("Performance review not found", 404);

        // Only allow deletion of draft reviews
        if (existing.status !== "draft")
            throw new ServiceError(
                "Only draft reviews can be deleted",
                400
            );

        await PerformanceReview.findByIdAndDelete(reviewId);
    }, "Failed to delete performance review");

export const acknowledgePerformanceReviewService = (
    reviewId: string,
    userId: string
) =>
    wrapService(async () => {
        if (!isNonEmptyString(reviewId))
            throw new ServiceError("Review ID is required", 400);
        if (!isNonEmptyString(userId))
            throw new ServiceError("User ID is required", 400);

        const existing = await PerformanceReview.findById(reviewId).lean() as any;
        if (!existing) throw new ServiceError("Performance review not found", 404);

        // Only the employee can acknowledge their review
        if (existing.employee.toString() !== userId)
            throw new ServiceError(
                "Only the reviewed employee can acknowledge the review",
                403
            );

        // Only completed reviews can be acknowledged
        if (existing.status !== "completed")
            throw new ServiceError(
                "Only completed reviews can be acknowledged",
                400
            );

        const updated = await PerformanceReview.findByIdAndUpdate(
            reviewId,
            {
                $set: {
                    status: "acknowledged",
                    acknowledgedAt: new Date(),
                    acknowledgedBy: userId,
                },
            },
            { new: true, runValidators: true, lean: true }
        );

        if (!updated)
            throw new ServiceError("Failed to acknowledge review", 500);

        return updated as unknown as IPerformanceReviewDoc;
    }, "Failed to acknowledge performance review");

export default {
    createPerformanceReviewService,
    getAllPerformanceReviewsService,
    getPerformanceReviewByIdService,
    getPerformanceReviewsByEmployeeService,
    getPerformanceReviewsByReviewerService,
    updatePerformanceReviewService,
    deletePerformanceReviewService,
    acknowledgePerformanceReviewService,
};
