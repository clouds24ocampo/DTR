// src/stores/leave/leave.store.ts
import { AxiosError } from "axios";
import { create } from "zustand";

import {
  createLeaveApi,
  editLeaveApi,
  getAllLeavesApi,
  getLeavesByEmployeeIdApi,
  getLeavesByStatusApi,
  updateLeaveStatusApi,
} from "../../../api/global/leave/leave.api";

import type {
  CreateLeaveRequestBodyInput,
  EditLeaveRequestBodyInput,
  ILeaveRequestDoc,
  LeaveStatus,
  UpdateLeaveStatusBodyInput,
} from "../../../types/global/leave/leave.type";

/* ----------------------------- Helpers ----------------------------- */

function extractErrorMessage(error: unknown): string {
  if ((error as AxiosError)?.isAxiosError) {
    const e = error as AxiosError<{ message?: string }>;
    return e.response?.data?.message || e.message || "Request failed";
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

const getKey = (x: { id?: string; _id?: string }) =>
  (x?.id || x?._id || "").trim();

function normalizeDoc<T extends { id?: string; _id?: string }>(doc: T) {
  const id = (doc.id || doc._id || "").trim();
  return { ...doc, id } as T & { id: string };
}

function normalizeList<T extends { id?: string; _id?: string }>(list: T[]) {
  return list.map(normalizeDoc);
}

function upsertLeave(
  list: ILeaveRequestDoc[],
  item: ILeaveRequestDoc
): ILeaveRequestDoc[] {
  const key = getKey(item);
  const idx = list.findIndex((x) => getKey(x) === key);
  if (idx >= 0) {
    const next = list.slice();
    next[idx] = normalizeDoc(item);
    return next;
  }
  return [normalizeDoc(item), ...list];
}

/* ------------------------------- Store ------------------------------ */

type LeaveStore = {
  // Data
  leaves: ILeaveRequestDoc[];

  // Loading flags
  fetchAllLoading: boolean;
  fetchByEmployeeLoading: boolean;
  fetchByStatusLoading: boolean;
  createLoading: boolean;
  updateLoading: boolean;

  // Error
  error: string | null;

  // Setters
  clearError: () => void;

  // Queries
  fetchAllLeaves: () => Promise<ILeaveRequestDoc[]>;
  fetchLeavesByEmployeeId: (employeeId: string) => Promise<ILeaveRequestDoc[]>;
  fetchLeavesByStatus: (status: LeaveStatus) => Promise<ILeaveRequestDoc[]>;

  // Mutations
  createLeave: (
    payload: CreateLeaveRequestBodyInput
  ) => Promise<ILeaveRequestDoc>;
  editLeave: (
    leaveId: string,
    patch: EditLeaveRequestBodyInput,
    editorId?: string
  ) => Promise<ILeaveRequestDoc>;
  updateLeaveStatus: (
    leaveId: string,
    payload: UpdateLeaveStatusBodyInput
  ) => Promise<ILeaveRequestDoc>;
};

export const useLeaveStore = create<LeaveStore>((set) => ({
  // Data
  leaves: [],

  // Loading flags
  fetchAllLoading: false,
  fetchByEmployeeLoading: false,
  fetchByStatusLoading: false,
  createLoading: false,
  updateLoading: false,

  // Error
  error: null,

  // Setters
  clearError: () => set({ error: null }),

  /* ------------------------------ Queries ------------------------------ */

  fetchAllLeaves: async () => {
    set({ fetchAllLoading: true, error: null });
    try {
      const data = (await getAllLeavesApi()) as unknown as ILeaveRequestDoc[];
      const normalized = normalizeList(data);
      set({ leaves: normalized });
      return normalized;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchAllLoading: false });
    }
  },

  fetchLeavesByEmployeeId: async (employeeId) => {
    set({ fetchByEmployeeLoading: true, error: null });
    try {
      const data = (await getLeavesByEmployeeIdApi(
        employeeId
      )) as unknown as ILeaveRequestDoc[];
      const normalized = normalizeList(data);
      set({ leaves: normalized });
      return normalized;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchByEmployeeLoading: false });
    }
  },

  fetchLeavesByStatus: async (status) => {
    set({ fetchByStatusLoading: true, error: null });
    try {
      const data = (await getLeavesByStatusApi(
        status
      )) as unknown as ILeaveRequestDoc[];
      const normalized = normalizeList(data);
      set({ leaves: normalized });
      return normalized;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchByStatusLoading: false });
    }
  },

  /* ----------------------------- Mutations ----------------------------- */

  createLeave: async (payload) => {
    set({ createLoading: true, error: null });
    try {
      const created = (await createLeaveApi(
        payload
      )) as unknown as ILeaveRequestDoc;
      const normalized = normalizeDoc(created);
      set((s) => ({ leaves: upsertLeave(s.leaves, normalized) }));
      return normalized;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ createLoading: false });
    }
  },

  editLeave: async (leaveId, patch, editorId) => {
    const safeId = (leaveId || "").trim();
    if (!safeId) {
      const msg =
        "editLeave: missing leaveId (pass selectedLeave.id || selectedLeave._id)";
      set({ error: msg });
      throw new Error(msg);
    }

    set({ updateLoading: true, error: null });
    try {
      const updated = (await editLeaveApi(
        safeId,
        patch,
        editorId
      )) as unknown as ILeaveRequestDoc;
      const normalized = normalizeDoc(updated);
      set((s) => ({ leaves: upsertLeave(s.leaves, normalized) }));
      return normalized;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ updateLoading: false });
    }
  },

  updateLeaveStatus: async (leaveId, payload) => {
    const safeId = (leaveId || "").trim();
    if (!safeId) {
      const msg =
        "updateLeaveStatus: missing leaveId (pass selectedLeave.id || selectedLeave._id)";
      set({ error: msg });
      throw new Error(msg);
    }

    set({ updateLoading: true, error: null });
    try {
      const updated = (await updateLeaveStatusApi(
        safeId,
        payload
      )) as unknown as ILeaveRequestDoc;
      const normalized = normalizeDoc(updated);
      set((s) => ({ leaves: upsertLeave(s.leaves, normalized) }));
      return normalized;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ updateLoading: false });
    }
  },
}));
