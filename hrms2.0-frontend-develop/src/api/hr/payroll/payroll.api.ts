import axiosInstance from "../../../axios/axiosInstance";
import { CalculatePayrollPayload, GetPayrollsPayload, Payroll } from "../../../types/hr/payroll/payroll.type";

export const calculatePayroll = async (payload: CalculatePayrollPayload) => {
  const response = await axiosInstance.post<Payroll>("/api/payroll/calculate", payload);
  return response.data;
};

export const getPayrolls = async (params: GetPayrollsPayload) => {
  const response = await axiosInstance.get<Payroll[]>("/api/payroll", { params });
  return response.data;
};

export const updatePayroll = async (id: string, updates: Partial<Payroll>) => {
    const response = await axiosInstance.put<Payroll>(`/api/payroll/${id}`, updates);
    return response.data;
};

export const deletePayroll = async (id: string) => {
    const response = await axiosInstance.delete<{ message: string }>(`/api/payroll/${id}`);
    return response.data;
};
