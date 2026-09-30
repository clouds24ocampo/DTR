import { asyncHandler } from "../../../utils/global/error";
import { getUserFromCookie } from "../../../utils/global/getCookie";
import { ServiceError } from "../../../utils/global/error";
import type { AssignToWorkstationBodyInput } from "../../../types/workforce/workplace/workplace.type";
import { assignToWorkstationService } from "../../../services/workforce/workplace/assignToWorkstation.service";
import {
  getWorkplaceDayViewService,
  unassignUserService,
} from "../../../services/workforce/workplace/workplaceAssign.service";
import {
  createWorkplaceService,
  deleteWorkplaceService,
  deleteWorkstationService,
  getAllWorkplacesService,
  updateWorkplaceService,
  updateWorkstationService,
} from "../../../services/workforce/workplace/workplaceCRUD.service";
import { selfAssignToStationService } from "../../../services/workforce/workplace/selfAssign.service";
import { selfUnassignFromStationService } from "../../../services/workforce/workplace/selfUnassign.service";
import {
  assertTimeRange,
  parseMealTimes,
  requireDate,
} from "../../../services/workforce/workplace/workplaceValidation";

// Controllers stay thin: authenticate, delegate to services, shape the response.
// Errors (ServiceError or unexpected) are handled by the global errorHandler.

export const createWorkplace = asyncHandler(async (req, res) => {
  const { name, workstationCount, stationNames } = req.body;
  getUserFromCookie(req);
  const data = await createWorkplaceService({ name, workstationCount, stationNames });
  res.status(201).json({ message: "Workplace created", data });
});

export const assignToWorkstation = asyncHandler(async (req, res) => {
  const result = await assignToWorkstationService({
    workplaceId: req.params.workplaceId,
    callerId: getUserFromCookie(req)?.id,
    body: req.body as AssignToWorkstationBodyInput,
  });
  res.status(201).json(result);
});

export const getWorkplaceByDate = asyncHandler(async (req, res) => {
  const { workplaceId, date } = req.params;
  getUserFromCookie(req);
  res.json(await getWorkplaceDayViewService(workplaceId, requireDate(date)));
});

export const viewAllWorkplace = asyncHandler(async (_req, res) => {
  res.status(200).json(await getAllWorkplacesService());
});

export const unassignUser = asyncHandler(async (req, res) => {
  const { workplaceId, workstationId, date, userId } = req.params;
  await unassignUserService(workplaceId, workstationId, date, userId);
  res.status(200).json({ message: "User unassigned successfully" });
});

export const deleteWorkplace = asyncHandler(async (req, res) => {
  await deleteWorkplaceService(req.params.workplaceId);
  res.status(200).json({ message: "Workplace deleted successfully" });
});

export const deleteWorkstation = asyncHandler(async (req, res) => {
  await deleteWorkstationService(req.params.workplaceId, req.params.workstationId);
  res.status(200).json({ message: "Workstation deleted successfully" });
});

export const updateWorkplace = asyncHandler(async (req, res) => {
  const { name, workstationCount, stationNames } = req.body;
  getUserFromCookie(req);
  const data = await updateWorkplaceService(req.params.workplaceId, {
    name,
    workstationCount,
    stationNames,
  });
  res.status(200).json({ message: "Workplace updated", data });
});

export const updateWorkstation = asyncHandler(async (req, res) => {
  getUserFromCookie(req);
  await updateWorkstationService(
    req.params.workplaceId,
    req.params.workstationId,
    req.body.stationName
  );
  res.status(204).send();
});

export const selfAssignToStation = asyncHandler(async (req, res) => {
  const me = getUserFromCookie(req);
  const { date, stationName, label, scheduledStartTime, scheduledEndTime, startMealTime } = req.body;

  const assignmentDate = requireDate(date);
  if (typeof stationName !== "string" || !stationName.trim()) {
    throw new ServiceError("stationName is required", 400);
  }
  // Times and label are optional (taken from the existing schedule); validate only when supplied.
  if (scheduledStartTime && scheduledEndTime) {
    assertTimeRange(scheduledStartTime, scheduledEndTime);
    parseMealTimes(startMealTime, scheduledStartTime, scheduledEndTime);
  }

  const result = await selfAssignToStationService({
    userId: me.id,
    workplaceId: req.params.workplaceId,
    date: assignmentDate,
    stationName: stationName.trim(),
    label: label?.trim() || "Regular Work",
    scheduledStartTime: scheduledStartTime || "",
    scheduledEndTime: scheduledEndTime || "",
    startMealTime,
  });
  res.status(201).json(result);
});

export const selfUnassignFromStation = asyncHandler(async (req, res) => {
  const me = getUserFromCookie(req);
  const result = await selfUnassignFromStationService({
    userId: me.id,
    workplaceId: req.params.workplaceId,
    date: requireDate(req.params.date),
  });
  res.status(200).json(result);
});
