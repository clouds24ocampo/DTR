import { Request, Response } from "express";
import * as PayrollService from "../../../services/hr/payroll/payroll.service";
import { CustomRequest } from "../../../types/global/express/express.type";

export const calculatePayroll = async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.body;
    // Assuming auth middleware populates req.account
    const performedBy = (req as CustomRequest).account?._id; 

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields: userId, startDate, endDate" });
    }
    
    // If no user is logged in (e.g. testing without auth), handle gracefully or throw
    // Ideally this endpoint is protected.
    
    const payroll = await PayrollService.calculatePayroll(userId, startDate, endDate, performedBy as string);
    return res.status(200).json(payroll);
  } catch (error: any) {
    console.error("calculatePayroll error:", error);
    return res.status(500).json({ message: error.message || "Failed to calculate payroll" });
  }
};

export const updatePayroll = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const performedBy = (req as CustomRequest).account?._id;

        const payroll = await PayrollService.updatePayroll(id, updates, performedBy as string);
        return res.status(200).json(payroll);
    } catch (error: any) {
        console.error("updatePayroll error:", error);
        return res.status(500).json({ message: error.message || "Failed to update payroll" });
    }
};

export const deletePayroll = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const performedBy = (req as CustomRequest).account?._id;
        
        await PayrollService.deletePayroll(id, performedBy as string);
        return res.status(200).json({ message: "Payroll deleted successfully" });
    } catch (error: any) {
        console.error("deletePayroll error:", error);
        return res.status(500).json({ message: error.message || "Failed to delete payroll" });
    }
};

export const getPayrolls = async (req: Request, res: Response) => {
    try {
        const query = req.query;
        const filter: any = {};
        if (query.employeeId) filter.employee = query.employeeId;
        if (query.startDate && query.endDate) {
            const start = new Date(query.startDate as string);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(query.endDate as string);
            end.setUTCHours(23, 59, 59, 999);
            filter.periodStart = { $gte: start };
            filter.periodEnd = { $lte: end };
        }
        
        const payrolls = await PayrollService.getPayrolls(filter);
        return res.status(200).json(payrolls);
    } catch (error: any) {
        console.error("getPayrolls error:", error);
        return res.status(500).json({ message: error.message || "Failed to fetch payrolls" });
    }
}
