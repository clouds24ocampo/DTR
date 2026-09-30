import { NextFunction, Request, Response } from "express";
import {
    CreatePerformanceReviewInput,
    UpdatePerformanceReviewInput,
    PerformanceStatus,
} from "src/types/hr/performance/performance.type";
import { ServiceError } from "src/utils/global/error";
import {
    createPerformanceReviewService,
    getAllPerformanceReviewsService,
    getPerformanceReviewByIdService,
    getPerformanceReviewsByEmployeeService,
    getPerformanceReviewsByReviewerService,
    updatePerformanceReviewService,
    deletePerformanceReviewService,
    acknowledgePerformanceReviewService,
} from "../../../services/hr/performance/performance.service";

const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
        (req: Request, res: Response, next: NextFunction) =>
            fn(req, res, next).catch(next);

const sendOk = (res: Response, data: any) =>
    res.status(200).json({ success: true, data });

const sendCreated = (res: Response, data: any) =>
    res.status(201).json({ success: true, data });

const handleControllerError = (
    err: unknown,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof ServiceError) {
        const anyErr = err as unknown as {
            status?: number;
            statusCode?: number;
            message: string;
        };
        const code = anyErr.status ?? anyErr.statusCode ?? 400;
        return res.status(code).json({ success: false, message: err.message });
    }
    return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
};

export const createPerformanceReviewController = asyncHandler(
    async (req, res, next) => {
        try {
            const body = req.body as CreatePerformanceReviewInput;
            const created = await createPerformanceReviewService(body);
            return sendCreated(res, created);
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);

export const getAllPerformanceReviewsController = asyncHandler(
    async (req, res, next) => {
        try {
            const items = await getAllPerformanceReviewsService();
            return sendOk(res, items);
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);

export const getPerformanceReviewByIdController = asyncHandler(
    async (req, res, next) => {
        try {
            const { reviewId } = req.params;
            const item = await getPerformanceReviewByIdService(reviewId);
            return sendOk(res, item);
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);

export const getPerformanceReviewsByEmployeeController = asyncHandler(
    async (req, res, next) => {
        try {
            const { employeeId } = req.params;
            const items = await getPerformanceReviewsByEmployeeService(employeeId);
            return sendOk(res, items);
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);

export const getPerformanceReviewsByReviewerController = asyncHandler(
    async (req, res, next) => {
        try {
            const { reviewerId } = req.params;
            const items = await getPerformanceReviewsByReviewerService(reviewerId);
            return sendOk(res, items);
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);

export const updatePerformanceReviewController = asyncHandler(
    async (req, res, next) => {
        try {
            const { reviewId } = req.params;
            const patch = req.body as UpdatePerformanceReviewInput;
            const updated = await updatePerformanceReviewService(reviewId, patch);
            return sendOk(res, updated);
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);

export const deletePerformanceReviewController = asyncHandler(
    async (req, res, next) => {
        try {
            const { reviewId } = req.params;
            await deletePerformanceReviewService(reviewId);
            return sendOk(res, { message: "Review deleted successfully" });
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);

export const acknowledgePerformanceReviewController = asyncHandler(
    async (req, res, next) => {
        try {
            const { reviewId } = req.params;
            const userId =
                (req as any).user?.id ||
                (req.headers["x-user-id"] as string) ||
                (req.body.userId as string);

            const updated = await acknowledgePerformanceReviewService(reviewId, userId);
            return sendOk(res, updated);
        } catch (err) {
            return handleControllerError(err, res, next);
        }
    }
);
