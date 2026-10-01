/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  createDTR as createDTRApi,
  endDTRItem as endDTRItemApi,
  fetchAllDTRs as fetchAllDTRsApi,
  fetchDTRsByDate as fetchDTRsByDateApi,
  fetchDTRsByUserAndDate as fetchDTRsByUserAndDateApi,
  fetchDTRsByUserId as fetchDTRsByUserIdApi,
  fetchMyDTRByDate as fetchMyDTRByDateApi,
  startDTRItem as startDTRItemApi,
  cancelTrip as cancelTripApi,
} from "../../../api/global/dtr/dtr.api";
import {
  DTRDocLite,
  CreateDTRBodyInput,
  StartDTRItemBodyInput,
  EndDTRItemBodyInput,
} from "../../../types/global/dtr/dtr.type";

/** Store shape */
export type DTRStoreType = {
  // flags
  loading: boolean;
  createLoading: boolean;
  startLoading: boolean;
  endLoading: boolean;
  cancelLoading: boolean;

  // data
  allDTRs: DTRDocLite[];
  ownDTR: DTRDocLite | null;
  userDTRs: DTRDocLite[];
  dateDTRs: DTRDocLite[];
  filteredDTRs: DTRDocLite[];

  // setter
  setLoading: (value: boolean) => void;

  // queries
  loadAllDTRs: () => Promise<DTRDocLite[] | null>;
  loadUserDTRs: (userId: string) => Promise<DTRDocLite[] | null>;
  loadDateDTRs: (date: string) => Promise<DTRDocLite[] | null>;
  loadMyDTRByDate: (
    date: string,
    opts?: { autoCreate?: boolean }
  ) => Promise<DTRDocLite | null>;
  loadDTRsByUserAndDate: (payload: {
    userId: string;
    date: string;
    kiosk?: boolean;
    password?: string;
  }) => Promise<DTRDocLite[] | null>;

  // mutations
  createDTR: (payload: CreateDTRBodyInput) => Promise<boolean>;
  startItem: (payload: StartDTRItemBodyInput) => Promise<boolean>;
  endItem: (payload: EndDTRItemBodyInput) => Promise<boolean>;
  cancelTripRequest: (payload: { userId: string; date: string; convertToWork?: boolean; password?: string }) => Promise<boolean>;

  reset: () => void;
};

// ---- Shared API Call Handler ----
async function handleApiCall<T>(
  set: (state: Partial<DTRStoreType>) => void,
  apiCall: () => Promise<T>,
  onSuccess?: (data: T) => void,
  successMessage?: string,
  errorMessage?: string
): Promise<T | null> {
  set({ loading: true });
  try {
    const response = await apiCall();
    onSuccess?.(response);
    if (successMessage) toast.success(successMessage);
    return response;
  } catch (error) {
    if (error instanceof AxiosError) {
      toast.error(error.response?.data?.message || errorMessage || "API error");
    } else {
      toast.error(errorMessage || "An unexpected error occurred.");
    }
    return null;
  } finally {
    set({ loading: false });
  }
}

// Extract payload whether API returns axios response or raw data
function pickPayload<T = unknown>(res: any): T {
  return (res?.data ?? res) as T;
}

// Decide best post-mutation refresh
// ---- Zustand Store ----
export const useDTRStore = create(
  persist<DTRStoreType>(
    (set) => ({
      // flags
      loading: false,
      createLoading: false,
      startLoading: false,
      endLoading: false,
      cancelLoading: false,

      // data
      allDTRs: [],
      ownDTR: null,
      userDTRs: [],
      dateDTRs: [],
      filteredDTRs: [],

      // setter
      setLoading: (value) => set({ loading: value }),

      /* ---------------------------------- QUERIES ---------------------------------- */

      loadAllDTRs: async () => {
        const res = await handleApiCall(
          set,
          fetchAllDTRsApi,
          (data) => {
            const payload = pickPayload<{
              message: string;
              dtrs: DTRDocLite[];
            }>(data);
            set({ allDTRs: payload?.dtrs ?? [] });
          },
          undefined,
          "Failed to fetch DTRs."
        );
        if (!res) return null;
        const payload = pickPayload<{ message: string; dtrs: DTRDocLite[] }>(
          res
        );
        return payload?.dtrs ?? [];
      },

      loadUserDTRs: async (userId: string) => {
        const res = await handleApiCall(
          set,
          () => fetchDTRsByUserIdApi(userId),
          (data) => {
            const payload = pickPayload<{
              message: string;
              dtrs: DTRDocLite[];
            }>(data);
            set({ userDTRs: payload?.dtrs ?? [] });
          },
          undefined,
          "Failed to fetch user DTRs."
        );
        if (!res) return null;
        const payload = pickPayload<{ message: string; dtrs: DTRDocLite[] }>(
          res
        );
        return payload?.dtrs ?? [];
      },

      loadDateDTRs: async (date: string) => {
        const res = await handleApiCall(
          set,
          () => fetchDTRsByDateApi(date),
          (data) => {
            const payload = pickPayload<{
              message: string;
              dtrs: DTRDocLite[];
            }>(data);
            set({ dateDTRs: payload?.dtrs ?? [] });
          },
          undefined,
          "Failed to fetch DTRs by date."
        );
        if (!res) return null;
        const payload = pickPayload<{ message: string; dtrs: DTRDocLite[] }>(
          res
        );
        return payload?.dtrs ?? [];
      },

      loadMyDTRByDate: async (date, opts) => {
        const res = await handleApiCall(
          set,
          () => fetchMyDTRByDateApi(date, opts),
          (data) => {
            const payload = pickPayload<{ message: string; dtr: DTRDocLite }>(
              data
            );
            const dtr = payload?.dtr ?? null;
            set({
              ownDTR: dtr,
              filteredDTRs: dtr ? [dtr] : [],
            });
          },
          undefined,
          "Failed to fetch your DTR."
        );
        if (!res) return null;
        const payload = pickPayload<{ message: string; dtr: DTRDocLite }>(res);
        return payload?.dtr ?? null;
      },

      loadDTRsByUserAndDate: async (payloadIn) => {
        const safeDate =
          typeof payloadIn.date === "string"
            ? payloadIn.date.split("T")[0]
            : new Date(payloadIn.date).toISOString().split("T")[0];

        const res = await handleApiCall(
          set,
          () => fetchDTRsByUserAndDateApi({ ...payloadIn, date: safeDate }),
          (data) => {
            const payload = pickPayload<{
              message: string;
              dtrs: DTRDocLite[];
            }>(data);
            const list = payload?.dtrs ?? [];
            set((state) => ({
              filteredDTRs: list,
              ownDTR:
                state.ownDTR && state.ownDTR.userId === payloadIn.userId
                  ? (list.length > 0 ? list[0] : null)
                  : state.ownDTR,
            }));
          },
          undefined,
          "Failed to fetch DTRs by user & date."
        );

        if (!res) return null;
        const payload = pickPayload<{ message: string; dtrs: DTRDocLite[] }>(
          res
        );
        return payload?.dtrs ?? [];
      },

      /* --------------------------------- MUTATIONS --------------------------------- */

      createDTR: async (payload) => {
        set({ createLoading: true });
        try {
          const res = await handleApiCall(
            set,
            () => createDTRApi(payload),
            undefined, // clock page refreshes itself (kiosk read needs the password)
            "DTR created.",
            "Failed to create DTR."
          );
          return !!res;
        } finally {
          set({ createLoading: false });
        }
      },

      startItem: async (payload) => {
        set({ startLoading: true });
        try {
          const res = await handleApiCall(
            set,
            () => startDTRItemApi(payload),
            undefined, // clock page refreshes itself (kiosk read needs the password)
            "Timer started.",
            "Failed to start DTR item."
          );
          return !!res;
        } finally {
          set({ startLoading: false });
        }
      },

      endItem: async (payload) => {
        set({ endLoading: true });
        try {
          const res = await handleApiCall(
            set,
            () => endDTRItemApi(payload),
            undefined, // clock page refreshes itself (kiosk read needs the password)
            "Timer ended.",
            "Failed to end DTR item."
          );
          return !!res;
        } finally {
          set({ endLoading: false });
        }
      },

      cancelTripRequest: async (payload) => {
        set({ cancelLoading: true });
        try {
          const res = await handleApiCall(
            set,
            () => cancelTripApi(payload),
            undefined, // clock page refreshes itself (kiosk read needs the password)
            payload.convertToWork ? "Converted to time in." : "Trip request cancelled.",
            payload.convertToWork ? "Failed to convert trip." : "Failed to cancel trip."
          );
          return !!res;
        } finally {
          set({ cancelLoading: false });
        }
      },

      reset: () =>
        set({
          loading: false,
          createLoading: false,
          startLoading: false,
          endLoading: false,
          cancelLoading: false,
          allDTRs: [],
          ownDTR: null,
          userDTRs: [],
          dateDTRs: [],
          filteredDTRs: [],
        }),
    }),
    {
      name: "dtr-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
