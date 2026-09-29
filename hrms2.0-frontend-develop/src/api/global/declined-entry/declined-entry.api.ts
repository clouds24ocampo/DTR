import axiosInstance from "../../../axios/axiosInstance";
import { handleError } from "../../../axios/errorHandler";
import type {
  CreateDeclinedEntryBodyInput,
  DeclinedEntryDocLite,
  GetDeclinedEntriesByUserAndDateBodyInput,
} from "../../../types/global/declined-entry/declined-entry.type";

export type CreateDeclinedEntryResponse = {
  message: string;
  declinedEntry: DeclinedEntryDocLite;
};

export type GetDeclinedEntriesResponse = {
  message: string;
  declinedEntries: DeclinedEntryDocLite[];
};

const trimIfString = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const createDeclinedEntry = async (
  payload: CreateDeclinedEntryBodyInput
): Promise<CreateDeclinedEntryResponse> => {
  try {
    const body: CreateDeclinedEntryBodyInput = {
      ...payload,
      userId: trimIfString(payload.userId) as string,
      date: trimIfString(payload.date) as string | undefined,
      coordinates: {
        lat: payload.coordinates.lat,
        lng: payload.coordinates.lng,
      },
    };
    const { data } = await axiosInstance.post<CreateDeclinedEntryResponse>(
      "/api/declined-entry/create",
      body
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const fetchDeclinedEntriesByUserAndDate = async (
  payload: GetDeclinedEntriesByUserAndDateBodyInput
): Promise<GetDeclinedEntriesResponse> => {
  try {
    const body = {
      userId: trimIfString(payload.userId) as string,
      date: trimIfString(payload.date) as string,
    };
    const { data } = await axiosInstance.post<GetDeclinedEntriesResponse>(
      "/api/declined-entry/filtered",
      body
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

