import { calculatePayroll } from "./payroll.service";
import Payroll from "../../../models/hr/payroll/payroll.model";
import PayrollAudit from "../../../models/hr/payroll/payroll-audit.model";
import DTR from "../../../models/global/dtr.model";
import User from "../../../models/workforce/user.model";

// Mock dependencies
jest.mock("../../../models/hr/payroll/payroll.model");
jest.mock("../../../models/hr/payroll/payroll-audit.model");
jest.mock("../../../models/global/dtr.model");
jest.mock("../../../models/workforce/user.model");

describe("Payroll Service - Overtime Tagging Logic", () => {
  const mockUser = {
    _id: "user123",
    salary: 22000, // 125 hourly
  };

  const mockPerformedBy = "adminUser123";

  beforeEach(() => {
    jest.clearAllMocks();
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (Payroll.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: "payroll123" });
    (PayrollAudit.create as jest.Mock).mockResolvedValue({});
  });

  it("should treat UNTAGGED excess weekday hours as Untagged Excess (Regular Pay) separate from Standard Regular", async () => {
    const startDate = "2023-10-02"; // Monday
    const endDate = "2023-10-02";

    const mockDTR = [{
      userId: "user123",
      date: "2023-10-02",
      sessions: [{
        scheduledStartTime: "08:00",
        scheduledEndTime: "17:00",
        workCredits: "08:00",
        DTRTotalWork: "09:00", // 9 hours total
        fullDTR: [
          { type: "work", status: "done", startTime: "08:00", endTime: "16:00", endTag: "Regular" }, // 8h
          { type: "work", status: "done", startTime: "16:00", endTime: "17:00", endTag: "--" } // 1h Excess, Untagged
        ]
      }]
    }];

    (DTR.find as jest.Mock).mockResolvedValue(mockDTR);

    await calculatePayroll("user123", startDate, endDate, mockPerformedBy);

    // Expect: 8 Regular Hours, 1 Untagged Excess, 0 OT
    expect(Payroll.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        regularHours: 8,
        untaggedExcessHours: 1,
        overtimeHours: 0,
      }),
      expect.anything()
    );
  });

  it("should treat TAGGED excess weekday hours as Overtime", async () => {
    const startDate = "2023-10-02"; // Monday
    const endDate = "2023-10-02";

    const mockDTR = [{
      userId: "user123",
      date: "2023-10-02",
      sessions: [{
        scheduledStartTime: "08:00",
        scheduledEndTime: "17:00",
        workCredits: "08:00",
        DTRTotalWork: "09:00",
        fullDTR: [
          { type: "work", status: "done", startTime: "08:00", endTime: "16:00", endTag: "Regular" }, // 8h
          { type: "work", status: "done", startTime: "16:00", endTime: "17:00", endTag: "Overtime" } // 1h Excess, Tagged
        ]
      }]
    }];

    (DTR.find as jest.Mock).mockResolvedValue(mockDTR);

    await calculatePayroll("user123", startDate, endDate, mockPerformedBy);

    // Expect: 8 Regular Hours, 0 Untagged, 1 OT
    expect(Payroll.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        regularHours: 8,
        untaggedExcessHours: 0,
        overtimeHours: 1,
      }),
      expect.anything()
    );
  });

  it("should handle MIXED tagged and untagged excess hours", async () => {
    const startDate = "2023-10-02"; // Monday
    const endDate = "2023-10-02";

    const mockDTR = [{
      userId: "user123",
      date: "2023-10-02",
      sessions: [{
        scheduledStartTime: "08:00",
        scheduledEndTime: "17:00",
        workCredits: "08:00",
        DTRTotalWork: "10:00", // 10 hours total
        fullDTR: [
          { type: "work", status: "done", startTime: "08:00", endTime: "16:00" }, // 8h Regular
          { type: "work", status: "done", startTime: "16:00", endTime: "17:00", endTag: "--" }, // 1h Excess Untagged
          { type: "work", status: "done", startTime: "17:00", endTime: "18:00", endTag: "Overtime" } // 1h Excess Tagged (OT)
        ]
      }]
    }];

    (DTR.find as jest.Mock).mockResolvedValue(mockDTR);

    await calculatePayroll("user123", startDate, endDate, mockPerformedBy);

    // Expect: 8 Regular Hours, 1 Untagged, 1 OT
    expect(Payroll.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        regularHours: 8,
        untaggedExcessHours: 1,
        overtimeHours: 1,
      }),
      expect.anything()
    );
  });
  
  it("should still treat Weekend work as OT regardless of tags", async () => {
    const startDate = "2023-10-01"; // Sunday
    const endDate = "2023-10-01";

    const mockDTR = [{
      userId: "user123",
      date: "2023-10-01",
      sessions: [{
        scheduledStartTime: "08:00",
        scheduledEndTime: "17:00",
        workCredits: "08:00",
        DTRTotalWork: "08:00",
        fullDTR: [
          { type: "work", status: "done", startTime: "08:00", endTime: "16:00", endTag: "--" } // 8h Untagged
        ]
      }]
    }];

    (DTR.find as jest.Mock).mockResolvedValue(mockDTR);

    await calculatePayroll("user123", startDate, endDate, mockPerformedBy);

    // Expect: 0 Regular, 0 Untagged, 8 OT (Weekend Rule)
    expect(Payroll.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        regularHours: 0,
        untaggedExcessHours: 0,
        overtimeHours: 8,
      }),
      expect.anything()
    );
  });
});
