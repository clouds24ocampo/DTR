// src/stores/department/department.store.ts
import { AxiosError } from "axios";
import { create } from "zustand";

import {
  addDepartmentMembersApi,
  createDepartmentApi,
  deleteDepartmentApi,
  getAllDepartmentsApi,
  getDepartmentByIdApi,
  removeDepartmentMemberApi,
  setDepartmentHeadApi,
  updateDepartmentApi,
} from "../../../api/global/department/department.api";

import type {
  CreateDepartmentBodyInput,
  DepartmentDoc,
  UpdateDepartmentBodyInput,
} from "../../../types/workforce/department/department.type";

/* ----------------------------- Helpers ----------------------------- */

function extractErrorMessage(error: unknown): string {
  if ((error as AxiosError)?.isAxiosError) {
    const e = error as AxiosError<{ message?: string }>;
    return e.response?.data?.message || e.message || "Request failed";
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

const toIdArray = (val: unknown): string[] => {
  if (Array.isArray(val))
    return val.filter((v): v is string => typeof v === "string" && !!v.trim());
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
};

/* ------------------------------- Store ------------------------------ */

type DepartmentStore = {
  departments: DepartmentDoc[];
  current: DepartmentDoc | null;
  selectedId: string | null;

  // Loading flags
  fetchAllLoading: boolean;
  fetchOneLoading: boolean;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
  headLoading: boolean;
  membersLoading: boolean;

  error: string | null;

  // setters
  clearError: () => void;
  setSelectedId: (id: string | null) => void;
  setCurrent: (dep: DepartmentDoc | null) => void;

  /* ------------------------------ Queries ------------------------------ */
  fetchAllDepartments: () => Promise<DepartmentDoc[]>;
  fetchDepartmentById: (departmentId: string) => Promise<DepartmentDoc>;

  /* ----------------------------- Mutations ----------------------------- */
  createDepartment: (
    payload: CreateDepartmentBodyInput
  ) => Promise<DepartmentDoc>;
  updateDepartment: (
    departmentId: string,
    payload: UpdateDepartmentBodyInput
  ) => Promise<DepartmentDoc>;
  setDepartmentHead: (departmentId: string, headId: string | null) => Promise<void>;
  addDepartmentMembers: (departmentId: string, memberIds: string[] | string) => Promise<DepartmentDoc>;
  removeDepartmentMember: (departmentId: string, memberId: string) => Promise<DepartmentDoc>;
  deleteDepartment: (departmentId: string) => Promise<void>;
};

export const useDepartmentStore = create<DepartmentStore>((set, get) => ({
  departments: [],
  current: null,
  selectedId: null,

  fetchAllLoading: false,
  fetchOneLoading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  headLoading: false,
  membersLoading: false,

  error: null,

  clearError: () => set({ error: null }),
  setSelectedId: (id) => set({ selectedId: id }),
  setCurrent: (dep) => set({ current: dep }),

  /* ------------------------------ Queries ------------------------------ */

  fetchAllDepartments: async () => {
    set({ fetchAllLoading: true, error: null });
    try {
      const data = await getAllDepartmentsApi();
      // Keep current in sync if selectedId matches
      const { selectedId } = get();
      const current =
        selectedId ? data.find((d) => d._id === selectedId) ?? null : null;
      set({ departments: data, current });
      return data;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchAllLoading: false });
    }
  },

  fetchDepartmentById: async (departmentId) => {
    set({ fetchOneLoading: true, error: null, selectedId: departmentId });
    try {
      const dep = await getDepartmentByIdApi(departmentId);
      // update or insert into list
      set((s) => ({
        departments: s.departments.some((d) => d._id === dep._id)
          ? s.departments.map((d) => (d._id === dep._id ? dep : d))
          : [dep, ...s.departments],
        current: dep,
      }));
      return dep;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchOneLoading: false });
    }
  },

  /* ----------------------------- Mutations ----------------------------- */

  createDepartment: async (payload) => {
    set({ createLoading: true, error: null });
    try {
      const dep = await createDepartmentApi({
        ...payload,
        members: toIdArray(payload.members),
        head: typeof payload.head === "string" ? payload.head : payload.head ?? undefined,
      });
      set((s) => ({
        departments: [dep, ...s.departments],
        current: dep,
        selectedId: dep._id,
      }));
      return dep;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ createLoading: false });
    }
  },

  updateDepartment: async (departmentId, payload) => {
    set({ updateLoading: true, error: null });
    try {
      const body: UpdateDepartmentBodyInput = {
        ...payload,
        members: payload.members ? toIdArray(payload.members) : undefined,
        head:
          payload.head === null
            ? null
            : typeof payload.head === "string"
            ? payload.head
            : payload.head ?? undefined,
      };

      const dep = await updateDepartmentApi(departmentId, body);
      set((s) => ({
        departments: s.departments.map((d) => (d._id === dep._id ? dep : d)),
        current: s.current && s.current._id === dep._id ? dep : s.current,
      }));
      return dep;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ updateLoading: false });
    }
  },

  setDepartmentHead: async (departmentId, headId) => {
    set({ headLoading: true, error: null });
    try {
      await setDepartmentHeadApi(departmentId, headId);
      // optimistic: update local state
      set((s) => {
        const updateOne = (d: DepartmentDoc): DepartmentDoc =>
          d._id === departmentId ? { ...d, head: headId } : d;
        return {
          departments: s.departments.map(updateOne),
          current: s.current ? updateOne(s.current) : s.current,
        };
      });
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ headLoading: false });
    }
  },

  addDepartmentMembers: async (departmentId, memberIdsInput) => {
    set({ membersLoading: true, error: null });
    try {
      const memberIds = toIdArray(memberIdsInput);
      const dep = await addDepartmentMembersApi(departmentId, memberIds);
      set((s) => ({
        departments: s.departments.map((d) => (d._id === dep._id ? dep : d)),
        current: s.current && s.current._id === dep._id ? dep : s.current,
      }));
      return dep;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ membersLoading: false });
    }
  },

  removeDepartmentMember: async (departmentId, memberId) => {
    set({ membersLoading: true, error: null });
    try {
      const dep = await removeDepartmentMemberApi(departmentId, memberId);
      set((s) => ({
        departments: s.departments.map((d) => (d._id === dep._id ? dep : d)),
        current: s.current && s.current._id === dep._id ? dep : s.current,
      }));
      return dep;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ membersLoading: false });
    }
  },

  deleteDepartment: async (departmentId) => {
    set({ deleteLoading: true, error: null });
    try {
      await deleteDepartmentApi(departmentId);
      set((s) => {
        const next = s.departments.filter((d) => d._id !== departmentId);
        const isCurrent = s.current?._id === departmentId;
        return {
          departments: next,
          current: isCurrent ? null : s.current,
          selectedId: isCurrent ? null : s.selectedId,
        };
      });
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ deleteLoading: false });
    }
  },
}));
