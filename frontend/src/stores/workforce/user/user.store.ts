/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import useAuthStore from "../../auth/auth.store";

import {
  fetchDTR as fetchDTRApi,
  fetchOtherUsers as fetchOtherUsersApi,
  fetchOwnDTR as fetchOwnDTRApi,
  fetchSchedule as fetchScheduleApi,
  fetchUserDetails as fetchUserDetailsApi,
} from "../../../api/workplace/user/user.api";

import { UserType } from "../../../types/workforce/user/user.type";

type UserStoreState = {
  loading: boolean;
  fetchUserLoading: boolean;
  updateUserLoading: boolean;

  user: UserType | null;
  otherUsers: UserType[];
  dtr: any[];
  ownDTR: any[];
  schedule: any[];

  setLoading: (value: boolean) => void;

  fetchMe: () => Promise<UserType | null>;
  fetchOtherUsers: () => Promise<UserType[] | null>;
  fetchDTRFor: (id: string) => Promise<any[] | null>;
  fetchOwnDTR: () => Promise<any[] | null>;
  fetchSchedule: () => Promise<any[] | null>;

  fetchUser: (id: string) => Promise<UserType | null>;
  updateUser: (user: UserType) => Promise<boolean>;
};

async function handleApiCall<T>(
  set: (partial: Partial<UserStoreState>) => void,
  apiCall: () => Promise<T>,
  onSuccess?: (data: T) => void,
  successMessage?: string,
  errorMessage?: string
): Promise<T | null> {
  set({ loading: true });
  try {
    const response = await apiCall();
    if (onSuccess) onSuccess(response);
    if (successMessage) toast.success(successMessage);
    return response;
  } catch (error) {
    // Don't show toast errors for 401 (Unauthorized) - these are expected when not authenticated
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        // Silently handle 401 errors - don't show toast or log
        return null;
      }
      toast.error(error.response?.data?.message || errorMessage || "API error");
    } else {
      toast.error(errorMessage || "An unexpected error occurred.");
    }
    return null;
  } finally {
    set({ loading: false });
  }
}

function pickPayload<T = unknown>(res: any): T {
  return (res?.data ?? res) as T;
}

function extractUserList(raw: any): UserType[] {
  const payload = raw?.data ?? raw;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.employees)) return payload.employees;
  return [];
}

export const useUserStore = create(
  persist<UserStoreState>(
    (set, get) => ({
      loading: false,
      fetchUserLoading: false,
      updateUserLoading: false,

      user: null,
      otherUsers: [],
      dtr: [],
      ownDTR: [],
      schedule: [],

      setLoading: (value) => set({ loading: value }),

      fetchMe: async () => {
        // Check if user is authenticated before making API call
        const authStore = useAuthStore.getState();
        if (!authStore.account) {
          // User is not authenticated, don't make the API call
          return null;
        }

        set({ fetchUserLoading: true });
        try {
          const res = await handleApiCall(
            set,
            fetchUserDetailsApi,
            (data) => set({ user: pickPayload<UserType>(data) }),
            undefined,
            "Failed to fetch user details."
          );
          return res ? pickPayload<UserType>(res) : null;
        } finally {
          set({ fetchUserLoading: false });
        }
      },

      fetchOtherUsers: async () => {
        // Check if user is authenticated before making API call
        const authStore = useAuthStore.getState();
        if (!authStore.account) {
          // User is not authenticated, don't make the API call
          return null;
        }

        const res = await handleApiCall(
          set,
          fetchOtherUsersApi,
          (data) => set({ otherUsers: extractUserList(data) }),
          undefined,
          "Failed to fetch users."
        );
        return res ? extractUserList(res) : null;
      },

      fetchDTRFor: async (id: string) => {
        const res = await handleApiCall(
          set,
          () => fetchDTRApi(id),
          (data) => set({ dtr: pickPayload<any[]>(data) }),
          undefined,
          "Failed to fetch DTR."
        );
        return res ? pickPayload<any[]>(res) : null;
      },

      fetchOwnDTR: async () => {
        const res = await handleApiCall(
          set,
          fetchOwnDTRApi,
          (data) => set({ ownDTR: pickPayload<any[]>(data) }),
          undefined,
          "Failed to fetch your DTR."
        );
        return res ? pickPayload<any[]>(res) : null;
      },

      fetchSchedule: async () => {
        const res = await handleApiCall(
          set,
          fetchScheduleApi,
          (data) => set({ schedule: pickPayload<any[]>(data) }),
          undefined,
          "Failed to fetch schedule."
        );
        return res ? pickPayload<any[]>(res) : null;
      },

      fetchUser: async (id: string) => {
        if (id === "me") {
          return await get().fetchMe();
        }
        const list = (await get().fetchOtherUsers()) ?? [];
        const found = list.find((u) => u._id === id) ?? null;
        set({ user: found });
        if (!found) toast.error("User not found.");
        return found;
      },

      updateUser: async () => {
        toast.error("Update user API is not implemented yet.");
        return false;
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
