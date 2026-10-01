import axiosInstance from "../../../axios/axiosInstance";
import { handleError } from "../../../axios/errorHandler";
import {
  CreateDepartmentBodyInput,
  DepartmentDoc,
  UpdateDepartmentBodyInput,
} from "../../../types/workforce/department/department.type";

const BASE = "/api/departments";

// tiny helpers to unwrap payloads that may be wrapped by { message, ... }
const pickList = (data: any): DepartmentDoc[] =>
  Array.isArray(data) ? data : data?.departments ?? data?.items ?? [];
const pickOne = (data: any): DepartmentDoc => data?.department ?? data;

export const createDepartmentApi = async (
  payload: CreateDepartmentBodyInput
): Promise<DepartmentDoc> => {
  try {
    const { data } = await axiosInstance.post(`${BASE}/create`, payload);
    return pickOne(data);
  } catch (error) {
    return handleError(error);
  }
};

export const getAllDepartmentsApi = async (): Promise<DepartmentDoc[]> => {
  try {
    const { data } = await axiosInstance.get(`${BASE}`);
    return pickList(data);
  } catch (error) {
    return handleError(error);
  }
};

export const getDepartmentByIdApi = async (
  departmentId: string
): Promise<DepartmentDoc> => {
  try {
    const { data } = await axiosInstance.get(`${BASE}/${departmentId}`);
    return pickOne(data);
  } catch (error) {
    return handleError(error);
  }
};

export const updateDepartmentApi = async (
  departmentId: string,
  payload: UpdateDepartmentBodyInput
): Promise<DepartmentDoc> => {
  try {
    const { data } = await axiosInstance.put(
      `${BASE}/${departmentId}`,
      payload
    );
    return pickOne(data);
  } catch (error) {
    return handleError(error);
  }
};

export const setDepartmentHeadApi = async (
  departmentId: string,
  headId: string | null
): Promise<void> => {
  try {
    await axiosInstance.patch(`${BASE}/${departmentId}/head`, { headId });
  } catch (error) {
    return handleError(error);
  }
};

export const addDepartmentMembersApi = async (
  departmentId: string,
  memberIds: string[]
): Promise<DepartmentDoc> => {
  try {
    const { data } = await axiosInstance.post(
      `${BASE}/${departmentId}/members`,
      { memberIds }
    );
    return pickOne(data);
  } catch (error) {
    return handleError(error);
  }
};

export const removeDepartmentMemberApi = async (
  departmentId: string,
  memberId: string
): Promise<DepartmentDoc> => {
  try {
    const { data } = await axiosInstance.delete(
      `${BASE}/${departmentId}/members/${memberId}`
    );
    return pickOne(data);
  } catch (error) {
    return handleError(error);
  }
};

export const deleteDepartmentApi = async (
  departmentId: string
): Promise<void> => {
  try {
    await axiosInstance.delete(`${BASE}/${departmentId}`);
  } catch (error) {
    return handleError(error);
  }
};
