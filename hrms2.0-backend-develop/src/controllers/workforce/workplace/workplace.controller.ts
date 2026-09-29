import { Request, Response } from "express";
import moment from "moment";
import {
  getWorkplaceDayViewService,
  prepareAssignmentService,
  unassignUserService,
} from "src/services/workforce/workplace/workplaceAssign.service";
import {
  createWorkplaceService,
  deleteWorkplaceService,
  deleteWorkstationService,
  getAllWorkplacesService,
  updateWorkplaceService,
  updateWorkstationService,
} from "src/services/workforce/workplace/workplaceCRUD.service";
import { selfAssignToStationService } from "src/services/workforce/workplace/selfAssign.service";
import { selfUnassignFromStationService } from "src/services/workforce/workplace/selfUnassign.service";
import { assignToWorkplaceService } from "src/services/workforce/workplace/workplaceLevelAssign.service";
import { ServiceError } from "src/utils/global/error";
import { getUserFromCookie } from "src/utils/global/getCookie";
import User from "../../../models/workforce/user.model";
import type {
  AssignToWorkstationBodyInput,
  CreateWorkplaceBodyInput,
} from "../../../types/workforce/workplace/workplace.type";
import { isDate, isTime, lt } from "../../../utils/global/schedule/validation.utils";
import { createSchedulesForUsersService } from "src/services/global/schedule/createSched.service";
import { sendScheduleConfirmationEmail } from "src/utils/global/mail/scheduleConfirmationEmail";

export const createWorkplace = async (req: Request, res: Response) => {
  try {
    const { name, workstationCount, stationNames } =
      req.body as CreateWorkplaceBodyInput;

    getUserFromCookie(req);
    const wp = await createWorkplaceService({
      name,
      workstationCount,
      stationNames,
    });

    return res.status(201).json({ message: "Workplace created", data: wp });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("createWorkplace error:", err);
    return res.status(500).json({ message: "Failed to create workplace" });
  }
};

export const assignToWorkstation = async (req: Request, res: Response) => {
  try {
    const { workplaceId } = req.params;
    const {
      date,
      stationName,
      user,
      label,
      scheduledStartTime,
      scheduledEndTime,
      startMealTime,
    } = req.body as AssignToWorkstationBodyInput;

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("🔵 Backend Controller - assignToWorkstation received:", {
        routeParamWorkplaceId: workplaceId,
        date,
        stationName,
        userId: user?.id,
        label,
        scheduledStartTime,
        scheduledEndTime,
        requestUrl: req.url,
        requestPath: req.path,
      });
    }

    console.log("date", date);

    // 1) Hard guards that previously caused TypeError -> generic 500
    if (typeof label !== "string" || label.trim() === "") {
      return res.status(400).json({ message: "label is required" });
    }

    // Resolve userId safely (no `.id` on undefined)
    let userId = user?.id;
    if (!userId) {
      const me = getUserFromCookie(req);
      userId = me?.id;
    }
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 2) Input validation (date/times/stationName)
    // Log the received date for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("assignToWorkstation - received date:", date, "type:", typeof date);
    }

    // Ensure date is a string and in correct format
    if (typeof date !== "string" || !date.trim()) {
      return res
        .status(400)
        .json({ message: "Date must be a non-empty string in YYYY-MM-DD format" });
    }

    const dateTrimmed = date.trim();
    if (!isDate(dateTrimmed)) {
      return res
        .status(400)
        .json({ message: `Valid date (YYYY-MM-DD) required. Received: "${dateTrimmed}"` });
    }

    if (!isTime(scheduledStartTime) || !isTime(scheduledEndTime)) {
      return res.status(400).json({ message: "Invalid time format (HH:mm)" });
    }
    
    // Allow overnight shifts (start > end)
    // Only reject if they are equal (0 duration)
    if (scheduledStartTime === scheduledEndTime) {
      return res.status(400).json({
        message: "scheduledEndTime cannot be equal to scheduledStartTime",
      });
    }

    // Check if the user being assigned is Frontline/Agent or Specialized Agent
    const targetUser = await User.findById(userId);
    const isAgentRole = targetUser?.position === "Frontline / Agent Roles" ||
      targetUser?.position === "Specialized Agent Roles";

    // For agent roles, stationName is optional (workplace-level assignment)
    // For other roles, stationName is required
    if (!isAgentRole && (!stationName || !stationName.trim())) {
      return res.status(400).json({ message: "stationName is required for this user role" });
    }

    // Validate/sanitize meal times
    let meals: string[] = [];
    if (typeof startMealTime !== "undefined") {
      if (!Array.isArray(startMealTime)) {
        return res
          .status(400)
          .json({ message: "startMealTime must be an array of HH:mm strings" });
      }
      if (!startMealTime.every((t) => typeof t === "string" && isTime(t))) {
        return res
          .status(400)
          .json({ message: "Invalid startMealTime entries (HH:mm)" });
      }
      meals = Array.from(new Set(startMealTime.map(String))).sort();
      
      const isOvernight = scheduledStartTime > scheduledEndTime;
      const bad = meals.find((t) => {
        if (isOvernight) {
          // For overnight shifts (e.g. 22:00 to 06:00), meal must be >= 22:00 OR < 06:00
          return !(t >= scheduledStartTime || t < scheduledEndTime);
        } else {
          // For standard shifts (e.g. 09:00 to 17:00), meal must be >= 09:00 AND < 17:00
          return !(t >= scheduledStartTime && t < scheduledEndTime);
        }
      });

      if (bad) {
        return res.status(400).json({
          message: `Meal time ${bad} must be within the scheduled window (${scheduledStartTime}–${scheduledEndTime})`,
        });
      }
    }

    // 3) Validate date format - USE THE USER'S SELECTED DATE AS-IS
    // DO NOT auto-adjust for past dates or overlaps - respect the user's selected date
    const providedDate = moment(dateTrimmed, "YYYY-MM-DD", true);
    if (!providedDate.isValid()) {
      return res.status(400).json({ message: `Invalid date format (YYYY-MM-DD). Received: "${dateTrimmed}"` });
    }

    // Use the user's selected date exactly as they specified
    // No auto-adjustment - if user selects a past date, use it
    // If user selects a future date, use it
    const finalAssignmentDate = dateTrimmed;

    if (process.env.NODE_ENV === "development") {
      console.log(`assignToWorkstation - using user's selected date: ${finalAssignmentDate}`);
    }

    try {
      // 4) If agent role and no station specified, use workplace-level assignment
      if (isAgentRole && (!stationName || !stationName.trim())) {
        const result = await assignToWorkplaceService({
          userId,
          workplaceId,
          date: finalAssignmentDate,
          label: label.trim(),
          scheduledStartTime,
          scheduledEndTime,
          startMealTime: meals.length > 0 ? meals : undefined,
        });

        // Send confirmation email
        if (targetUser && targetUser.email) {
          sendScheduleConfirmationEmail({
            email: targetUser.email,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            workplaceName: result.meta.workplaceName,
            stationName: null,
            date: result.meta.assignedDate,
            scheduledStartTime,
            scheduledEndTime,
            startMealTime: meals,
            label: label.trim(),
          }).catch((err) => {
            console.error("Failed to send schedule confirmation email:", err);
          });
        }

        return res.status(201).json({
          message: result.message,
          result: result.result,
          meta: {
            workplaceName: result.meta.workplaceName,
            stationName: null, // No station assigned yet
            assignedDate: result.meta.assignedDate,
          },
        });
      }

      // 5) For non-agent roles or agent roles with station specified, use station-level assignment
      // Prepare overlap-checked assignment (this throws ServiceError with clear message on issues)
      const prepared = await prepareAssignmentService({
        workplaceId,
        date: finalAssignmentDate,
        label: label.trim(),
        scheduledStartTime,
        scheduledEndTime,
        stationName: stationName!.trim(), // We know it's defined here
        startMealTime: meals,
      });

      // 6) Create matching Schedule entry (also throws ServiceError with clear message)
      // Pass workstationId so overlaps are only checked within the same workstation
      const response = await createSchedulesForUsersService({
        userIds: [userId],
        date: finalAssignmentDate,
        workstationId: prepared.workstationId, // Pass workstation ID for context
        sessions: [
          {
            label: label.trim(),
            scheduledStartTime,
            scheduledEndTime,
            startMealTime: meals,
          },
        ],
      });

      if (!response.result || response.result.length === 0) {
        // More informative than generic 500 when service returned no result
        return res
          .status(502)
          .json({ message: "Schedule creation returned no result" });
      }

      // 7) Commit to workplace after schedule is confirmed
      await prepared.commit(userId);

      // Success!
      // Send confirmation email
      if (targetUser && targetUser.email) {
        sendScheduleConfirmationEmail({
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          workplaceName: prepared.workplaceName,
          stationName: prepared.stationNameResolved,
          date: finalAssignmentDate,
          scheduledStartTime,
          scheduledEndTime,
          startMealTime: meals,
          label: label.trim(),
        }).catch((err) => {
          console.error("Failed to send schedule confirmation email:", err);
        });
      }

      return res.status(201).json({
        message: "Assignment created",
        result: response.result,
        meta: {
          workplaceName: prepared.workplaceName,
          stationName: prepared.stationNameResolved,
          assignedDate: finalAssignmentDate,
        },
      });
    } catch (err) {
      // If it's an overlap error (409), return it to the user instead of auto-adjusting
      // The user should know there's a conflict and can choose a different date/time
      if (err instanceof ServiceError && err.status === 409) {
        return res.status(409).json({
          message: `Assignment cannot be created on ${finalAssignmentDate}: ${err.message}. Please select a different date or time.`,
        });
      }
      // For other errors, rethrow to be caught by outer catch
      throw err;
    }
  } catch (err) {
    // If your services threw a ServiceError, pass it through
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    // Otherwise, log the real error so you can see WHY it failed
    console.error("assignToWorkstation error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    // Keep response generic but consistent
    return res.status(500).json({
      message: "Failed to assign to workstation",
      error: process.env.NODE_ENV === "development" ? errorMessage : undefined
    });
  }
};

export const getWorkplaceByDate = async (req: Request, res: Response) => {
  try {
    const { workplaceId, date } = req.params as {
      workplaceId: string;
      date: string;
    };

    getUserFromCookie(req);
    if (!isDate(date)) {
      return res.status(400).json({ message: "Invalid date (YYYY-MM-DD)" });
    }

    const view = await getWorkplaceDayViewService(workplaceId, date);
    return res.json(view);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("getWorkplaceByDate error:", err);
    return res.status(500).json({ message: "Failed to fetch workplace day" });
  }
};

export const viewAllWorkplace = async (_req: Request, res: Response) => {
  try {
    const workplaces = await getAllWorkplacesService();
    res.status(200).json(workplaces);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("viewAllWorkplace error:", err);
    return res.status(500).json({ message: "Failed to fetch workplaces" });
  }
};

export const unassignUser = async (req: Request, res: Response) => {
  try {
    const { workplaceId, workstationId, date, userId } = req.params;

    await unassignUserService(workplaceId, workstationId, date, userId);

    return res.status(200).json({ message: "User unassigned successfully" });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("unassignUser error:", err);
    return res.status(500).json({ message: "Failed to unassign user" });
  }
};

export const deleteWorkplace = async (req: Request, res: Response) => {
  try {
    const { workplaceId } = req.params;

    await deleteWorkplaceService(workplaceId);

    return res.status(200).json({ message: "Workplace deleted successfully" });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("deleteWorkplace error:", err);
    return res.status(500).json({ message: "Failed to delete workplace" });
  }
};

export const deleteWorkstation = async (req: Request, res: Response) => {
  try {
    const { workplaceId, workstationId } = req.params;

    await deleteWorkstationService(workplaceId, workstationId);

    return res
      .status(200)
      .json({ message: "Workstation deleted successfully" });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("deleteWorkstation error:", err);
    return res.status(500).json({ message: "Failed to delete workstation" });
  }
};

export const updateWorkplace = async (req: Request, res: Response) => {
  try {
    const { workplaceId } = req.params;
    const { name, workstationCount, stationNames } = req.body;

    getUserFromCookie(req);
    const updatedWorkplace = await updateWorkplaceService(workplaceId, {
      name,
      workstationCount,
      stationNames,
    });

    return res
      .status(200)
      .json({ message: "Workplace updated", data: updatedWorkplace });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("updateWorkplace error:", err);
    return res.status(500).json({ message: "Failed to update workplace" });
  }
};

export const updateWorkstation = async (req: Request, res: Response) => {
  try {
    const { workplaceId, workstationId } = req.params;
    const { stationName } = req.body;

    getUserFromCookie(req);
    await updateWorkstationService(workplaceId, workstationId, stationName);

    return res.status(204).send();
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("updateWorkstation error:", err);
    return res.status(500).json({ message: "Failed to update workstation" });
  }
};

export const selfAssignToStation = async (req: Request, res: Response) => {
  try {
    const { workplaceId } = req.params;
    const {
      date,
      stationName,
      label,
      scheduledStartTime,
      scheduledEndTime,
      startMealTime,
    } = req.body;

    // Get authenticated user
    const me = getUserFromCookie(req);
    if (!me?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Validate inputs
    if (typeof date !== "string" || !date.trim()) {
      return res
        .status(400)
        .json({ message: "Date must be a non-empty string in YYYY-MM-DD format" });
    }

    if (!isDate(date.trim())) {
      return res.status(400).json({ message: "Invalid date format (YYYY-MM-DD)" });
    }

    if (!stationName || !stationName.trim()) {
      return res.status(400).json({ message: "stationName is required" });
    }

    // Times and label are optional - will be taken from existing schedule if not provided
    // But if provided, validate them
    if (scheduledStartTime && scheduledEndTime) {
      if (!isTime(scheduledStartTime) || !isTime(scheduledEndTime)) {
        return res.status(400).json({ message: "Invalid time format (HH:mm)" });
      }

      // Allow overnight shifts (start > end)
      // Only reject if they are equal (0 duration)
      if (scheduledStartTime === scheduledEndTime) {
        return res.status(400).json({
          message: "scheduledEndTime cannot be equal to scheduledStartTime",
        });
      }

      // Validate meal times if provided
      if (typeof startMealTime !== "undefined") {
        if (!Array.isArray(startMealTime)) {
          return res
            .status(400)
            .json({ message: "startMealTime must be an array of HH:mm strings" });
        }
        if (!startMealTime.every((t) => typeof t === "string" && isTime(t))) {
          return res
            .status(400)
            .json({ message: "Invalid startMealTime entries (HH:mm)" });
        }
        const meals = Array.from(new Set(startMealTime.map(String))).sort();
        
        const isOvernight = scheduledStartTime > scheduledEndTime;
        const bad = meals.find((t) => {
          if (isOvernight) {
            // For overnight shifts (e.g. 22:00 to 06:00), meal must be >= 22:00 OR < 06:00
            return !(t >= scheduledStartTime || t < scheduledEndTime);
          } else {
            // For standard shifts (e.g. 09:00 to 17:00), meal must be >= 09:00 AND < 17:00
            return !(t >= scheduledStartTime && t < scheduledEndTime);
          }
        });

        if (bad) {
          return res.status(400).json({
            message: `Meal time ${bad} must be within the scheduled window (${scheduledStartTime}–${scheduledEndTime})`,
          });
        }
      }
    }

    const result = await selfAssignToStationService({
      userId: me.id,
      workplaceId,
      date: date.trim(),
      stationName: stationName.trim(),
      label: label?.trim() || "Regular Work",
      scheduledStartTime: scheduledStartTime || "",
      scheduledEndTime: scheduledEndTime || "",
      startMealTime: startMealTime,
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("selfAssignToStation error:", err);
    return res.status(500).json({ message: "Failed to assign to station" });
  }
};

export const selfUnassignFromStation = async (req: Request, res: Response) => {
  try {
    const { workplaceId, date } = req.params;

    // Get authenticated user
    const me = getUserFromCookie(req);
    if (!me?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Validate date
    if (!date || typeof date !== "string" || !date.trim()) {
      return res.status(400).json({ message: "Date is required" });
    }

    if (!isDate(date.trim())) {
      return res.status(400).json({ message: "Invalid date format (YYYY-MM-DD)" });
    }

    const result = await selfUnassignFromStationService({
      userId: me.id,
      workplaceId,
      date: date.trim(),
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("selfUnassignFromStation error:", err);
    return res.status(500).json({ message: "Failed to unassign from station" });
  }
};
