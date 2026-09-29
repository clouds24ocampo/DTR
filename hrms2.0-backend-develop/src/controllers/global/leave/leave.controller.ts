import { NextFunction, Request, Response } from "express";
import {
  CreateLeaveRequestBodyInput,
  EditLeaveRequestBodyInput,
  LeaveStatus,
  UpdateLeaveStatusBodyInput,
} from "src/types/global/leave/leave.type";
import { ServiceError } from "src/utils/global/error";
import {
  addLeaveService,
  editLeaveService,
  getAllLeavesService,
  getLeavesByEmployeeIdService,
  getLeavesByStatusService,
  updateLeaveStatusService,
} from "../../../services/global/leave/leave.service";

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

export const createLeaveController = asyncHandler(async (req, res, next) => {
  try {
    const body = req.body as CreateLeaveRequestBodyInput;
    const created = await addLeaveService(body);
    return sendCreated(res, created);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
});

export const getAllLeavesController = asyncHandler(async (req, res, next) => {
  try {
    const items = await getAllLeavesService();
    return sendOk(res, items);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
});

export const getLeavesByEmployeeIdController = asyncHandler(
  async (req, res, next) => {
    try {
      const { employeeId } = req.params;
      const items = await getLeavesByEmployeeIdService(employeeId);
      return sendOk(res, items);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }
);

export const getLeavesByStatusController = asyncHandler(
  async (req, res, next) => {
    try {
      const { status } = req.params as { status: LeaveStatus };
      const items = await getLeavesByStatusService(status);
      return sendOk(res, items);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }
);

export const editLeaveController = asyncHandler(async (req, res, next) => {
  try {
    const { leaveId } = req.params as { leaveId: string };
    // Pull editor from auth middleware if available; fall back to headers/body for now.
    const editorId =
      (req as any).user?.id ||
      (req.headers["x-editor-id"] as string) ||
      (req.body.editorId as string);

    const patch = req.body as EditLeaveRequestBodyInput;
    const updated = await editLeaveService(leaveId, editorId, patch);
    return sendOk(res, updated);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
});

export const updateLeaveStatusController = asyncHandler(
  async (req, res, next) => {
    try {
      const { leaveId } = req.params as { leaveId: string };
      // Reviewer can also come from auth middleware
      const reviewerId =
        (req as any).user?.id ||
        (req.headers["x-reviewer-id"] as string) ||
        (req.body.reviewerId as string);

      const payload = {
        ...req.body,
        reviewerId,
      } as UpdateLeaveStatusBodyInput;

      const updated = await updateLeaveStatusService(leaveId, payload);
      return sendOk(res, updated);
    } catch (err) {
      return handleControllerError(err, res, next);
    }
  }
);
