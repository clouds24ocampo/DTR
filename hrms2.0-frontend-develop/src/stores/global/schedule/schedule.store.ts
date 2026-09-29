import { AxiosError } from "axios";
import { create } from "zustand";

import {
  createSchedulesApi,
  deleteScheduleApi,
  editScheduleApi,
  editSingleSessionApi,
  getAllSchedulesApi,
  getMySchedulesByDateApi,
  getSchedulesByDateApi,
  getSchedulesByUserAndDateApi,
  getSchedulesByUserIdApi,
  triggerAutoScheduleApi,
  type CreateSchedulesResultItem,
  type AutoScheduleResult,
} from "../../../api/global/schedule/schedule.api";

import type {
  CreateSchedulesForUsersBodyInput,
  EditScheduleBodyInput,
  GetSchedulesByUserAndDateBodyInput,
  IScheduleDoc,
  ISession,
} from "../../../types/global/schedule/schedule.type";

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

const isWithinRange = (d: string, start: string, end: string) =>
  d >= start && d <= end;

/* ------------------------------- Store ------------------------------ */

type ScheduleStore = {
  schedules: IScheduleDoc[];

  selectedUserId: string | null;
  selectedDate: string | null;
  selectedRange: { startDate: string; endDate: string } | null;

  fetchAllLoading: boolean;
  fetchByUserIdLoading: boolean;
  fetchByDateLoading: boolean;
  fetchFilteredLoading: boolean;
  createLoading: boolean;
  editLoading: boolean;
  deleteLoading: boolean;

  error: string | null;

  clearError: () => void;
  setSelectedUserId: (userId: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedRange: (
    range: { startDate: string; endDate: string } | null
  ) => void;

  fetchAllSchedules: () => Promise<void>;
  fetchSchedulesByUserId: (userId: string) => Promise<IScheduleDoc[]>;
  fetchSchedulesByDate: (date: string | Date) => Promise<IScheduleDoc[]>;
  fetchSchedulesFiltered: (
    input: GetSchedulesByUserAndDateBodyInput
  ) => Promise<IScheduleDoc[]>;
  fetchMySchedulesByDate: (date: string | Date) => Promise<IScheduleDoc[]>;

  createSchedules: (
    input: CreateSchedulesForUsersBodyInput
  ) => Promise<CreateSchedulesResultItem[]>;
  editSchedule: (input: EditScheduleBodyInput) => Promise<IScheduleDoc>;
  editSingleSession: (
    scheduleId: string,
    sessionId: string,
    patch: Partial<ISession>,
    note?: string
  ) => Promise<IScheduleDoc>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
  /** Trigger auto-schedule for next day from history (e.g. after timeout). Optional userId & triggerDate. */
  triggerAutoSchedule: (userId?: string, triggerDate?: string) => Promise<AutoScheduleResult>;
};

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],

  selectedUserId: null,
  selectedDate: null,
  selectedRange: null,

  fetchAllLoading: false,
  fetchByUserIdLoading: false,
  fetchByDateLoading: false,
  fetchFilteredLoading: false,
  createLoading: false,
  editLoading: false,
  deleteLoading: false,

  error: null,

  clearError: () => set({ error: null }),
  setSelectedUserId: (userId) => set({ selectedUserId: userId }),
  setSelectedDate: (date) =>
    set({ selectedDate: date ? toISODate(date) : null }),
  setSelectedRange: (range) =>
    set({
      selectedRange: range
        ? {
            startDate: toISODate(range.startDate),
            endDate: toISODate(range.endDate),
          }
        : null,
    }),

  /* ------------------------------ Queries ------------------------------ */

  fetchAllSchedules: async () => {
    set({ fetchAllLoading: true, error: null });
    try {
      const data = await getAllSchedulesApi();
      console.log("fetchAllSchedules: received data:", data);
      console.log("fetchAllSchedules: data length:", data?.length);
      set({ schedules: data || [] });
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error("fetchAllSchedules: error:", msg, e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchAllLoading: false });
    }
  },

  fetchSchedulesByUserId: async (userId) => {
    set({
      fetchByUserIdLoading: true,
      error: null,
      selectedUserId: userId,
    });
    try {
      const data = await getSchedulesByUserIdApi(userId);
      console.log("fetchSchedulesByUserId: received data:", data);
      console.log("fetchSchedulesByUserId: data length:", data?.length);
      set({ schedules: data || [] });
      return data || [];
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error("fetchSchedulesByUserId: error:", msg, e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchByUserIdLoading: false });
    }
  },

  fetchSchedulesByDate: async (date) => {
    const day = toISODate(date);
    set({
      fetchByDateLoading: true,
      error: null,
      selectedDate: day,
      selectedRange: null,
    });
    try {
      const data = await getSchedulesByDateApi(day);
      console.log("fetchSchedulesByDate: received data:", data);
      console.log("fetchSchedulesByDate: data length:", data?.length);
      set({ schedules: data || [] });
      return data || [];
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error("fetchSchedulesByDate: error:", msg, e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchByDateLoading: false });
    }
  },

  fetchSchedulesFiltered: async (input) => {
    set({ fetchFilteredLoading: true, error: null });

    const normalized: GetSchedulesByUserAndDateBodyInput = {
      ...input,
      date: input.date ? toISODate(input.date) : undefined,
      startDate: input.startDate ? toISODate(input.startDate) : undefined,
      endDate: input.endDate ? toISODate(input.endDate) : undefined,
    };

    set({
      selectedUserId: normalized.userId ?? null,
      selectedDate: normalized.date ?? null,
      selectedRange:
        normalized.startDate && normalized.endDate
          ? { startDate: normalized.startDate, endDate: normalized.endDate }
          : null,
    });

    try {
      const data = await getSchedulesByUserAndDateApi(normalized);
      console.log("fetchSchedulesFiltered: received data:", data);
      console.log("fetchSchedulesFiltered: data length:", data?.length);
      set({ schedules: data || [] });
      return data || [];
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error("fetchSchedulesFiltered: error:", msg, e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchFilteredLoading: false });
    }
  },

  fetchMySchedulesByDate: async (date) => {
    const day = toISODate(date);
    set({
      fetchByDateLoading: true,
      error: null,
      selectedUserId: null,
      selectedDate: day,
      selectedRange: null,
    });
    try {
      const data = await getMySchedulesByDateApi(day);
      console.log("fetchMySchedulesByDate: received data:", data);
      console.log("fetchMySchedulesByDate: data length:", data?.length);
      set({ schedules: data || [] });
      return data || [];
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error("fetchMySchedulesByDate: error:", msg, e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchByDateLoading: false });
    }
  },

  /* ----------------------------- Mutations ----------------------------- */

  createSchedules: async (input) => {
    set({ createLoading: true, error: null });
    try {
      const payload: CreateSchedulesForUsersBodyInput = {
        ...input,
        date: toISODate(input.date),
      };
      const summary = await createSchedulesApi(payload);

      // Refresh if the current view would include the created schedules.
      const { selectedDate, selectedUserId, selectedRange } = get();
      const createdDate = payload.date;

      const dateMatchesSingle = !!selectedDate && selectedDate === createdDate;

      const dateMatchesRange =
        !!selectedRange &&
        isWithinRange(
          createdDate,
          selectedRange.startDate,
          selectedRange.endDate
        );

      const userMatches =
        !selectedUserId || payload.userIds.includes(selectedUserId);

      if ((dateMatchesSingle || dateMatchesRange) && userMatches) {
        await get().fetchSchedulesFiltered({
          userId: selectedUserId ?? undefined,
          date: dateMatchesSingle ? createdDate : undefined,
          startDate: dateMatchesRange ? selectedRange!.startDate : undefined,
          endDate: dateMatchesRange ? selectedRange!.endDate : undefined,
        });
      }

      return summary;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ createLoading: false });
    }
  },

  editSchedule: async (input) => {
    set({ editLoading: true, error: null });
    try {
      // normalize input (just like createSchedules)
      const payload: EditScheduleBodyInput = {
        ...input,
        sessions: input.sessions.map((s) => ({
          ...s,
          label: s.label.trim(), // make sure label is clean
        })),
      };

      const updated = await editScheduleApi(payload);

      // update schedules state
      set((s) => ({
        schedules: s.schedules.map((x) =>
          x._id === updated._id ? updated : x
        ),
      }));

      // refresh view if the updated schedule is in scope
      const { selectedUserId, selectedDate, selectedRange } = get();
      const inUserScope = !selectedUserId || updated.userId === selectedUserId;
      const inDateScope =
        (selectedDate && updated.date === selectedDate) ||
        (selectedRange &&
          isWithinRange(
            updated.date,
            selectedRange.startDate,
            selectedRange.endDate
          ));

      if (inUserScope && inDateScope) {
        await get().fetchSchedulesFiltered({
          userId: selectedUserId ?? undefined,
          date: selectedDate ?? undefined,
          startDate: selectedRange?.startDate ?? undefined,
          endDate: selectedRange?.endDate ?? undefined,
        });
      }

      return updated;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ editLoading: false });
    }
  },

  editSingleSession: async (scheduleId, sessionId, patch, note) => {
    set({ editLoading: true, error: null });
    try {
      const updated = await editSingleSessionApi(
        scheduleId,
        sessionId,
        patch,
        note
      );
      set((s) => ({
        schedules: s.schedules.map((x) =>
          x._id === updated._id ? updated : x
        ),
      }));

      // Same refresh behavior as editSchedule
      const { selectedUserId, selectedDate, selectedRange } = get();
      if (
        (selectedUserId == null || updated.userId === selectedUserId) &&
        ((selectedDate && updated.date === selectedDate) ||
          (selectedRange &&
            isWithinRange(
              updated.date,
              selectedRange.startDate,
              selectedRange.endDate
            )))
      ) {
        await get().fetchSchedulesFiltered({
          userId: selectedUserId ?? undefined,
          date: selectedDate ?? undefined,
          startDate: selectedRange?.startDate ?? undefined,
          endDate: selectedRange?.endDate ?? undefined,
        });
      }

      return updated;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ editLoading: false });
    }
  },

  deleteSchedule: async (scheduleId) => {
    set({ deleteLoading: true, error: null });
    try {
      await deleteScheduleApi(scheduleId);
      set((s) => ({
        schedules: s.schedules.filter((x) => x._id !== scheduleId),
      }));
      // Optional: keep the list fresh by re-running the current filter
      const { selectedUserId, selectedDate, selectedRange } = get();
      if (selectedDate || selectedRange || selectedUserId) {
        await get().fetchSchedulesFiltered({
          userId: selectedUserId ?? undefined,
          date: selectedDate ?? undefined,
          startDate: selectedRange?.startDate ?? undefined,
          endDate: selectedRange?.endDate ?? undefined,
        });
      }
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ deleteLoading: false });
    }
  },

  triggerAutoSchedule: async (userId, triggerDate) => {
    set({ error: null });
    try {
      const result = await triggerAutoScheduleApi(
        userId != null || triggerDate != null
          ? { userId: userId ?? undefined, triggerDate: triggerDate ?? undefined }
          : undefined
      );
      if (result.scheduled) {
        const { selectedUserId, selectedDate, selectedRange } = get();
        if (selectedUserId || selectedDate || selectedRange) {
          await get().fetchSchedulesFiltered({
            userId: selectedUserId ?? undefined,
            date: selectedDate ?? undefined,
            startDate: selectedRange?.startDate ?? undefined,
            endDate: selectedRange?.endDate ?? undefined,
          });
        }
      }
      return result;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    }
  },
}));
