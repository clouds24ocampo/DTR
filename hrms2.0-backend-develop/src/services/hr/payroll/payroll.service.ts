import moment from "moment";
import Payroll, { IPayroll } from "../../../models/hr/payroll/payroll.model";
import PayrollAudit from "../../../models/hr/payroll/payroll-audit.model";
import DTR from "../../../models/global/dtr.model";
import User, { IUser } from "../../../models/workforce/user.model";
import { getWorkingDaysInMonth } from "../../../utils/global/time.utils";

// Helper: Convert "HH:MM" to minutes
const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const calculatePayroll = async (
  userId: string,
  startDate: string,
  endDate: string,
  performedByUserId: string
) => {
  // 1. Fetch User
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const monthlySalary = user.salary || 0;
  // Formula: Monthly salary / Working Days in Month / 8
  const workingDaysInMonth = getWorkingDaysInMonth(startDate);
  const hourlyRate = monthlySalary / workingDaysInMonth / 8;

  // 2. Fetch DTRs
  const dtrs = await DTR.find({
    userId: userId,
    date: { $gte: startDate, $lte: endDate },
  });

  // Map DTRs by date for O(1) lookup
  const dtrMap = new Map();
  dtrs.forEach((dtr) => {
    // Normalize date to YYYY-MM-DD
    const dKey = moment(dtr.date).format("YYYY-MM-DD");
    dtrMap.set(dKey, dtr);
  });

  let totalRegularHours = 0; // Standard hours (up to 8/day)
  let totalWeekdayOTHours = 0;
  let totalWeekendOTHours = 0;
  let totalUntaggedExcessHours = 0; // Untagged Excess (treated as regular pay)
  let lateCount = 0;
  let totalLateHours = 0; // Track hours for deduction
  let absentDays = 0; // For audit/tracking
  const lateDetails: any[] = [];

  const start = moment(startDate);
  const end = moment(endDate);
  const day = start.clone();

  // 3. Process Dates
  while (day.isSameOrBefore(end)) {
    const dateStr = day.format("YYYY-MM-DD");
    const isWeekend = day.day() === 0 || day.day() === 6; // 0=Sun, 6=Sat
    const dtr = dtrMap.get(dateStr);

    if (dtr) {
      // Has attendance
      for (const session of dtr.sessions) {
        const workMinutes = timeToMinutes(session.DTRTotalWork);
        const scheduledMinutes = timeToMinutes(session.workCredits) || 480; // Default to 8h if not set?

        if (isWeekend) {
          // Weekend Logic: All work is treated as Weekend Overtime (Rest Day Work)
          totalWeekendOTHours += workMinutes / 60;
        } else {
          // Weekday Logic: Granular Overtime Calculation
          const REGULAR_DAY_MINS = 480;
          
          let dailyRegularMins = 0;
          let dailyOTMins = 0;
          let dailyUntaggedExcessMins = 0; // Tracked but treated as regular for pay
          let accumulatedWorkMins = 0;

          // Filter valid work entries and sort by start time
          const workEntries = session.fullDTR
            .filter((e: { type: string; status: string; startTime?: string; endTime?: string }) => 
              e.type === "work" && e.status === "done" && e.startTime && e.endTime
            )
            .sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          if (workEntries.length === 0) {
             // Fallback if fullDTR is empty but DTRTotalWork is present (legacy/migration safety)
             // Treat all as regular/OT based on simple calc
             const simpleRegular = Math.min(workMinutes, REGULAR_DAY_MINS);
             const simpleExcess = Math.max(0, workMinutes - REGULAR_DAY_MINS);
             dailyRegularMins = simpleRegular;
             // Without tags, treat excess as regular
             // dailyRegularMins += simpleExcess; // Removed to keep separate
             dailyUntaggedExcessMins += simpleExcess;
          } else {
            for (const entry of workEntries) {
              if (!entry.startTime || !entry.endTime) continue;
              
              const startMin = timeToMinutes(entry.startTime);
              let endMin = timeToMinutes(entry.endTime);
              
              // Handle cross-midnight (end time next day)
              if (endMin < startMin) {
                endMin += 1440; // Add 24 hours
              }
              
              const entryDuration = endMin - startMin;
              if (entryDuration <= 0) continue;

              const previousAccumulated = accumulatedWorkMins;
              accumulatedWorkMins += entryDuration;

              // Calculate overlaps
              // 1. Portion falling within the first 480 mins (Standard Regular)
              const standardEnd = REGULAR_DAY_MINS;
              
              const entryStartInGlobal = previousAccumulated;
              const entryEndInGlobal = accumulatedWorkMins;

              // Intersection with [0, 480]
              const overlapRegular = Math.max(0, Math.min(entryEndInGlobal, standardEnd) - Math.max(entryStartInGlobal, 0));
              
              // Intersection with [480, Infinity] (Excess)
              const overlapExcess = Math.max(0, entryEndInGlobal - Math.max(entryStartInGlobal, standardEnd));

              // Assign Regular
              dailyRegularMins += overlapRegular;

              // Assign Excess based on Tag
              if (overlapExcess > 0) {
                // Check if entry is explicitly tagged as Overtime
                // We check endTag or startTag. Usually endTag.
                const isTaggedOT = (entry.endTag && entry.endTag.toLowerCase() === "overtime") || 
                                   (entry.startTag && entry.startTag.toLowerCase() === "overtime");
                
                if (isTaggedOT) {
                  dailyOTMins += overlapExcess;
                } else {
                  // Untagged Excess -> Treated as Regular Pay
                  // dailyRegularMins += overlapExcess; // REMOVED: Keep separate for reporting
                  dailyUntaggedExcessMins += overlapExcess;
                }
              }
            }
          }

          totalRegularHours += dailyRegularMins / 60;
          totalWeekdayOTHours += dailyOTMins / 60;
          totalUntaggedExcessHours += dailyUntaggedExcessMins / 60;

          // Check Lateness (Only on Weekdays/Scheduled days)
          // Sort to find the earliest work entry
          const sortedWorkEntries = session.fullDTR
            .filter((e: { type: string; status: string; startTime?: string }) => e.type === "work" && e.status === "done" && e.startTime)
            .sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          const firstWorkEntry = sortedWorkEntries[0];

          if (firstWorkEntry && firstWorkEntry.startTime && session.scheduledStartTime) {
            const scheduledMin = timeToMinutes(session.scheduledStartTime);
            const actualMin = timeToMinutes(firstWorkEntry.startTime);
            if (actualMin > scheduledMin) {
              const lateMin = actualMin - scheduledMin;
              if (lateMin >= 30) {
                lateCount++;
                const deductionHrs = Math.ceil(lateMin / 60);
                totalLateHours += deductionHrs;

                lateDetails.push({
                  date: dateStr,
                  session: session.label || "Regular Work",
                  lateMinutes: lateMin,
                  deductionHours: deductionHrs,
                  actualTime: firstWorkEntry.startTime,
                  scheduledTime: session.scheduledStartTime
                });
              }
            }
          }
        }
      }
    } else {
      // No DTR
      if (!isWeekend) {
        // Weekday Absence
        // Prompt: "distinguish between regular weekday absences and weekend non-work days"
        // We count this as absent.
        absentDays++;
      }
      // Weekend No DTR: Do nothing (Excluded from absenteeism)
    }

    day.add(1, "days");
  }

  // 4. Calculate Pay
  // Multipliers
  const OT_MULTIPLIER_WEEKDAY = 1.25;
  const OT_MULTIPLIER_WEEKEND = 1.30;

  // Base Pay includes Standard Regular (Untagged Excess is excluded)
  const basePay = totalRegularHours * hourlyRate;
  
  const weekdayOTPay = totalWeekdayOTHours * hourlyRate * OT_MULTIPLIER_WEEKDAY;
  const weekendOTPay = totalWeekendOTHours * hourlyRate * OT_MULTIPLIER_WEEKEND;
  
  const totalOvertimePay = weekdayOTPay + weekendOTPay;

  // Deductions: Hourly rounding for every late >= 30 mins
  const lateDeductionAmount = totalLateHours * hourlyRate;

  // Note: Absenteeism is handled by NOT adding to totalRegularHours.
  // If we wanted to show "Deduction for Absence" from a fixed monthly salary, we would calculate:
  // Gross = MonthlySalary - (AbsentDays * DailyRate) + OT.
  // BUT we are using accumulation: Gross = (RegularHours * Rate) + OT.
  // This is mathematically consistent provided Rate = Monthly/22/8.
  
  const grossPay = basePay + totalOvertimePay;
  const netPay = grossPay - lateDeductionAmount;

  // 5. Save/Update Payroll
  const payroll = await Payroll.findOneAndUpdate(
    {
      employee: userId,
      periodStart: new Date(startDate),
      periodEnd: new Date(endDate),
    },
    {
      regularHours: totalRegularHours,
      untaggedExcessHours: totalUntaggedExcessHours, // Save separate field
      overtimeHours: totalWeekdayOTHours + totalWeekendOTHours, // Sum of hours for storage
      lateCount,
      lateHours: totalLateHours,
      lateDeductionAmount,
      lateDetails,
      hourlyRate,
      grossPay,
      netPay,
      status: "draft",
    },
    { upsert: true, new: true }
  );

  // 6. Audit Log
  await PayrollAudit.create({
    payrollId: payroll._id,
    action: "CALCULATE",
    performedBy: performedByUserId,
    details: `Base: ${basePay.toFixed(2)} (RegHrs: ${totalRegularHours.toFixed(1)}, UntaggedExcess: ${totalUntaggedExcessHours.toFixed(1)}h), OT: ${totalOvertimePay.toFixed(2)} (Wkday: ${totalWeekdayOTHours.toFixed(1)}h, Wkend: ${totalWeekendOTHours.toFixed(1)}h), LateDed: ${lateDeductionAmount.toFixed(2)}, AbsentDays: ${absentDays}. Net: ${netPay.toFixed(2)}`,
  });

  return payroll;
};

export const updatePayroll = async (
  id: string,
  updates: Partial<IPayroll>,
  performedByUserId: string
) => {
  const payroll = await Payroll.findByIdAndUpdate(id, updates, { new: true });
  if (!payroll) throw new Error("Payroll not found");

  await PayrollAudit.create({
    payrollId: payroll._id,
    action: "UPDATE",
    performedBy: performedByUserId,
    details: `Updated fields: ${Object.keys(updates).join(", ")}`,
  });

  return payroll;
};

export const deletePayroll = async (id: string, performedByUserId: string) => {
  const payroll = await Payroll.findByIdAndDelete(id);
  if (!payroll) throw new Error("Payroll not found");

  await PayrollAudit.create({
    payrollId: id as any,
    action: "DELETE",
    performedBy: performedByUserId,
    details: "Deleted payroll record",
  });

  return payroll;
};

export const getPayrolls = async (query: any) => {
  return await Payroll.find(query).populate("employee", "firstName lastName profilePicture idNumber");
};

export const getPayrollById = async (id: string) => {
  return await Payroll.findById(id).populate("employee", "firstName lastName profilePicture idNumber");
};
