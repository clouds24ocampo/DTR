import { AxiosError } from "axios";
import { create } from "zustand";

import {
  assignToWorkstationApi,
  createWorkplaceApi,
  deleteWorkplaceApi,
  deleteWorkstationApi,
  getWorkplaceByDateApi,
  selfAssignToStationApi,
  selfUnassignFromStationApi,
  unassignUserApi,
  updateWorkplaceApi,
  updateWorkstationApi,
  viewAllWorkplaceApi,
  type SelfAssignToStationBodyInput,
} from "../../../api/workplace/workplace.api";

import type {
  AssignToWorkstationBodyInput,
  CreateWorkplaceBodyInput,
  IWorkplace,
  UpdateWorkplaceBodyInput,
  UpdateWorkstationBodyInput,
  WorkplaceDayView,
  WorkplaceStationDay,
  Workstation,
} from "../../../types/workforce/workplace/workplace.type";

/* ----------------------------- Helpers ----------------------------- */

function extractErrorMessage(error: unknown): string {
  if ((error as AxiosError)?.isAxiosError) {
    const e = error as AxiosError<{ message?: string }>;
    return e.response?.data?.message || e.message || "Request failed";
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

function toISODate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

function buildDayView(workplace: IWorkplace, date: string): WorkplaceDayView {
  const day = toISODate(date);
  return {
    workplaceId: workplace._id,
    name: workplace.name,
    workstationCount: workplace.workstationCount,
    stations: (workplace.workstations || []).map((ws: Workstation) => {
      const dayEntry: WorkplaceStationDay = ws.dates?.find(
        (d) => toISODate(d.date) === day
      ) ?? {
        date: day,
        assignedUsers: [],
      };

      return {
        workstationId: ws._id,
        stationName: ws.stationName,
        date: dayEntry.date,
        assignedUsers: dayEntry.assignedUsers || [],
      };
    }),
  };
}

/* ------------------------------- Store ------------------------------ */

type WorkplaceStore = {
  workplaces: IWorkplace[];
  selectedWorkplace: IWorkplace | null;

  dayView: WorkplaceDayView | null;

  fetchWorkplacesLoading: boolean;
  dayViewLoading: boolean;
  createWorkplaceLoading: boolean;
  assignToWorkstationLoading: boolean;
  updateWorkplaceLoading: boolean;
  updateWorkstationLoading: boolean;
  unassignUserLoading: boolean;
  deleteWorkplaceLoading: boolean;
  deleteWorkstationLoading: boolean;
  selfAssignToStationLoading: boolean;
  selfUnassignFromStationLoading: boolean;

  error: string | null;

  clearError: () => void;
  setSelectedWorkplace: (workplace: IWorkplace | null) => void;
  setSelectedWorkplaceById: (workplaceId: string) => void;

  fetchAllWorkplaces: () => Promise<void>;
  getDayView: (
    workplaceId: string,
    date: string,
    preferApi?: boolean
  ) => Promise<WorkplaceDayView | null>;

  createWorkplace: (data: CreateWorkplaceBodyInput) => Promise<IWorkplace>;
  updateWorkplace: (
    workplaceId: string,
    data: UpdateWorkplaceBodyInput
  ) => Promise<IWorkplace>;
  deleteWorkplace: (workplaceId: string) => Promise<void>;

  assignToWorkstation: (
    workplaceId: string,
    data: AssignToWorkstationBodyInput
  ) => Promise<IWorkplace>;
  updateWorkstation: (
    workplaceId: string,
    workstationId: string,
    data: UpdateWorkstationBodyInput
  ) => Promise<void>;
  unassignUser: (
    workplaceId: string,
    workstationId: string,
    date: string,
    userId: string
  ) => Promise<void>;
  deleteWorkstation: (
    workplaceId: string,
    workstationId: string
  ) => Promise<void>;
  selfAssignToStation: (
    workplaceId: string,
    data: SelfAssignToStationBodyInput
  ) => Promise<{ message: string; meta: { workplaceName: string; stationName: string; assignedDate: string } }>;
  selfUnassignFromStation: (
    workplaceId: string,
    date: string
  ) => Promise<{ message: string }>;
};

export const useWorkplaceStore = create<WorkplaceStore>((set, get) => ({
  workplaces: [],
  selectedWorkplace: null,
  dayView: null,

  fetchWorkplacesLoading: false,
  dayViewLoading: false,
  createWorkplaceLoading: false,
  assignToWorkstationLoading: false,
  updateWorkplaceLoading: false,
  updateWorkstationLoading: false,
  unassignUserLoading: false,
  deleteWorkplaceLoading: false,
  deleteWorkstationLoading: false,
  selfAssignToStationLoading: false,
  selfUnassignFromStationLoading: false,

  error: null,

  clearError: () => set({ error: null }),
  setSelectedWorkplace: (workplace) => set({ selectedWorkplace: workplace }),
  setSelectedWorkplaceById: (workplaceId) => {
    const w = get().workplaces.find((x) => x._id === workplaceId) || null;
    set({ selectedWorkplace: w });
  },

  /* ------------------------------ Queries ------------------------------ */

  fetchAllWorkplaces: async () => {
    set({ fetchWorkplacesLoading: true, error: null });
    try {
      const data = await viewAllWorkplaceApi();
      // Ensure data is always an array
      const workplacesArray = Array.isArray(data) ? data : [];
      set({ workplaces: workplacesArray });

      const sel = get().selectedWorkplace;
      if (sel) {
        const refreshed = workplacesArray.find((w) => w._id === sel._id) || null;
        set({ selectedWorkplace: refreshed });
      }
    } catch (e) {
      const errorMsg = extractErrorMessage(e);
      const is403 = (e as any)?.response?.status === 403;
      const isPermissionDenied =
        /insufficient permissions|forbidden/i.test(errorMsg);
      // Handle 404 or 403 gracefully - no workplaces / no permission is valid for some roles (e.g. Intern)
      if (
        errorMsg.includes("No workplaces found") ||
        errorMsg.includes("404") ||
        is403 ||
        isPermissionDenied
      ) {
        set({ workplaces: [], error: null });
      } else {
        set({ error: errorMsg });
      }
      if (
        !errorMsg.includes("No workplaces found") &&
        !errorMsg.includes("404") &&
        !is403 &&
        !isPermissionDenied
      ) {
        throw e;
      }
    } finally {
      set({ fetchWorkplacesLoading: false });
    }
  },

  getDayView: async (workplaceId, date, preferApi = true) => {
    set({ dayViewLoading: true, error: null });
    const day = toISODate(date);

    try {
      if (preferApi) {
        const fromApi = await getWorkplaceByDateApi(workplaceId, day);
        set({ dayView: fromApi });
        return fromApi;
      }

      const base: IWorkplace | null =
        get().workplaces.find((w) => w._id === workplaceId) ||
        get().selectedWorkplace ||
        null;

      if (!base) {
        set({ dayView: null });
        return null;
      }

      const derived = buildDayView(base, day);
      set({ dayView: derived });
      return derived;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg, dayView: null });
      return null;
    } finally {
      set({ dayViewLoading: false });
    }
  },

  /* ----------------------------- Mutations ----------------------------- */

  createWorkplace: async (input) => {
    set({ createWorkplaceLoading: true, error: null });
    try {
      const created = await createWorkplaceApi(input); // returns IWorkplace
      // Refresh all workplaces to ensure we have complete data with all workstations
      await get().fetchAllWorkplaces();
      return created;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ createWorkplaceLoading: false });
    }
  },

  updateWorkplace: async (workplaceId, input) => {
    set({ updateWorkplaceLoading: true, error: null });
    try {
      const updated = await updateWorkplaceApi(workplaceId, input); // returns IWorkplace
      // Refresh all workplaces to ensure we have complete data with all workstations
      await get().fetchAllWorkplaces();
      // Update selected workplace if it was the one updated
      const refreshed = get().workplaces.find((w) => w._id === workplaceId);
      if (refreshed) {
        set({ selectedWorkplace: refreshed });
        // Update day view if needed
        const currentView = get().dayView;
        if (currentView && currentView.workplaceId === workplaceId) {
          await get().getDayView(
            workplaceId,
            currentView.stations[0]?.date || toISODate(new Date()),
            true
          );
        }
      }
      return refreshed || updated;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ updateWorkplaceLoading: false });
    }
  },

  deleteWorkplace: async (workplaceId) => {
    set({ deleteWorkplaceLoading: true, error: null });
    try {
      await deleteWorkplaceApi(workplaceId);
      set((s) => ({
        workplaces: s.workplaces.filter((w) => w._id !== workplaceId),
        selectedWorkplace:
          s.selectedWorkplace?._id === workplaceId ? null : s.selectedWorkplace,
        dayView: s.dayView?.workplaceId === workplaceId ? null : s.dayView,
      }));
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ deleteWorkplaceLoading: false });
    }
  },

  assignToWorkstation: async (workplaceId, input) => {
    set({ assignToWorkstationLoading: true, error: null });
    try {
      // POST returns { message, result, meta }
      const resp = await assignToWorkstationApi(workplaceId, input);

      // Refresh workplaces so local state mirrors server (assignment mutates nested arrays)
      await get().fetchAllWorkplaces();

      // Use the actual assigned date from the response meta, or fall back to input date
      const assignedDate = resp?.meta?.assignedDate 
        ? toISODate(resp.meta.assignedDate)
        : toISODate(input.date ?? new Date());
      
      // Refresh the day view using the actual assigned date (prefer API so we pick up normalized meal arrays etc.)
      await get().getDayView(workplaceId, assignedDate, true);

      // Return the updated workplace from the store
      const updatedWorkplace = get().workplaces.find((w) => w._id === workplaceId);
      if (!updatedWorkplace) {
        throw new Error("Workplace not found after assignment");
      }
      return updatedWorkplace;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      // Re-throw with proper error structure so it can be caught in the UI
      const error = e as any;
      if (error?.response) {
        throw error; // Axios error with response
      }
      throw new Error(msg); // Generic error
    } finally {
      set({ assignToWorkstationLoading: false });
    }
  },

  updateWorkstation: async (workplaceId, workstationId, input) => {
    set({ updateWorkstationLoading: true, error: null });
    try {
      await updateWorkstationApi(workplaceId, workstationId, input); // void

      // Refresh workplaces and day view to reflect the new station name
      await get().fetchAllWorkplaces();
      const currentView = get().dayView;
      if (currentView && currentView.workplaceId === workplaceId) {
        await get().getDayView(
          workplaceId,
          currentView.stations[0]?.date || toISODate(new Date()),
          true
        );
      }
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ updateWorkstationLoading: false });
    }
  },

  unassignUser: async (workplaceId, workstationId, date, userId) => {
    set({ unassignUserLoading: true, error: null });
    try {
      await unassignUserApi(workplaceId, workstationId, date, userId);

      // Refresh workplaces first to ensure we have the latest data
      await get().fetchAllWorkplaces();

      // Refresh day view via API
      await get().getDayView(workplaceId, date, true);
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ unassignUserLoading: false });
    }
  },

  deleteWorkstation: async (workplaceId, workstationId) => {
    set({ deleteWorkstationLoading: true, error: null });
    try {
      await deleteWorkstationApi(workplaceId, workstationId);
      await get().fetchAllWorkplaces();
      const currentView = get().dayView;
      if (currentView && currentView.workplaceId === workplaceId) {
        await get().getDayView(
          workplaceId,
          currentView.stations[0]?.date || toISODate(new Date()),
          true
        );
      }
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ deleteWorkstationLoading: false });
    }
  },

  selfAssignToStation: async (workplaceId, input) => {
    set({ selfAssignToStationLoading: true, error: null });
    try {
      const resp = await selfAssignToStationApi(workplaceId, input);

      // Refresh workplaces to get updated station assignments
      await get().fetchAllWorkplaces();

      // Refresh day view for the assigned date
      const assignedDate = resp?.meta?.assignedDate 
        ? toISODate(resp.meta.assignedDate)
        : toISODate(input.date);
      
      await get().getDayView(workplaceId, assignedDate, true);

      return {
        message: resp.message,
        meta: resp.meta,
      };
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      // Re-throw with proper error structure
      const error = e as any;
      if (error?.response) {
        throw error;
      }
      throw new Error(msg);
    } finally {
      set({ selfAssignToStationLoading: false });
    }
  },

  selfUnassignFromStation: async (workplaceId, date) => {
    set({ selfUnassignFromStationLoading: true, error: null });
    try {
      const resp = await selfUnassignFromStationApi(workplaceId, date);

      // Refresh workplaces to get updated station assignments
      await get().fetchAllWorkplaces();

      // Refresh day view for the unassigned date
      const unassignedDate = toISODate(date);
      await get().getDayView(workplaceId, unassignedDate, true);

      return {
        message: resp.message,
      };
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      // Re-throw with proper error structure
      const error = e as any;
      if (error?.response) {
        throw error;
      }
      throw new Error(msg);
    } finally {
      set({ selfUnassignFromStationLoading: false });
    }
  },
}));
