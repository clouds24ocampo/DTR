export interface LateDetail {
  date: string;
  session: string;
  lateMinutes: number;
  deductionHours: number;
  actualTime: string;
  scheduledTime: string;
}

export interface Payroll {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    idNumber?: string;
  } | string;
  idNumber: string;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  untaggedExcessHours?: number;
  overtimeHours: number;
  lateCount: number;
  lateHours?: number;
  lateDeductionAmount: number;
  lateDetails?: LateDetail[]; // Detailed breakdown of each late occurrence
  hourlyRate: number;
  grossPay: number;
  netPay: number;
  status: "draft" | "finalized" | "paid";
  createdAt: string;
  updatedAt: string;
}

export interface CalculatePayrollPayload {
  userId: string;
  startDate: string;
  endDate: string;
}

export interface GetPayrollsPayload {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
}
