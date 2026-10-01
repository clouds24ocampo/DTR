import { create } from "zustand";
import { calculatePayroll, getPayrolls, getMyPayrolls, updatePayroll, deletePayroll } from "../../../api/hr/payroll/payroll.api";
import { Payroll } from "../../../types/hr/payroll/payroll.type";
import toast from "react-hot-toast";

interface PayrollStore {
  payrolls: Payroll[];
  loading: boolean;
  calculatePayroll: (userId: string, startDate: string, endDate: string) => Promise<void>;
  fetchPayrolls: (employeeId?: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchMyPayrolls: (startDate?: string, endDate?: string) => Promise<void>;
  updatePayroll: (id: string, updates: Partial<Payroll>) => Promise<void>;
  deletePayroll: (id: string) => Promise<void>;
}

const extractPayrollList = (raw: any): Payroll[] => {
  const payload = raw?.data ?? raw;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.payrolls)) return payload.payrolls;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const usePayrollStore = create<PayrollStore>((set) => ({
  payrolls: [],
  loading: false,

  calculatePayroll: async (userId, startDate, endDate) => {
    set({ loading: true });
    try {
      await calculatePayroll({ userId, startDate, endDate });
      toast.success("Payroll calculated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to calculate payroll");
    } finally {
      set({ loading: false });
    }
  },

  fetchPayrolls: async (employeeId, startDate, endDate) => {
    set({ loading: true });
    try {
      const payrolls = await getPayrolls({ employeeId, startDate, endDate });
      set({ payrolls: extractPayrollList(payrolls) });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch payrolls");
      set((state) => ({ payrolls: Array.isArray(state.payrolls) ? state.payrolls : [] }));
    } finally {
      set({ loading: false });
    }
  },

  fetchMyPayrolls: async (startDate, endDate) => {
    set({ loading: true });
    try {
      set({ payrolls: extractPayrollList(await getMyPayrolls({ startDate, endDate })) });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch your payslips");
      set({ payrolls: [] });
    } finally {
      set({ loading: false });
    }
  },

  updatePayroll: async (id, updates) => {
      set({ loading: true });
      try {
          const updatedPayroll = await updatePayroll(id, updates);
          set((state) => ({
              payrolls: state.payrolls.map((p) => (p._id === id ? updatedPayroll : p))
          }));
          toast.success("Payroll updated successfully");
      } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to update payroll");
      } finally {
          set({ loading: false });
      }
  },

  deletePayroll: async (id) => {
      set({ loading: true });
      try {
          await deletePayroll(id);
          set((state) => ({
              payrolls: state.payrolls.filter((p) => p._id !== id)
          }));
          toast.success("Payroll deleted successfully");
      } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to delete payroll");
      } finally {
          set({ loading: false });
      }
  }
}));
