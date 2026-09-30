import moment from "moment";
import { DTRDocLite } from "../../../types/global/dtr/dtr.type";

export interface LateDeductionResult {
  deductionAmount: number;
  totalLateHours: number;
  occurrences: number;
  breakdown: {
    date: string;
    session: string;
    lateMinutes: number;
    deductionHours: number;
    amount: number;
    actualTime: string;
    scheduledTime: string;
  }[];
}

/**
 * Calculates late deductions based on the following rules:
 * 1. 30-minute threshold: No deduction if late < 30 mins.
 * 2. Hourly rounding: Partial hours rounded UP to next full hour (e.g. 31 mins -> 1 hr).
 * 3. Applies to both morning and afternoon sessions independently.
 */
export const calculateLateDeduction = (
  dtrs: DTRDocLite[],
  hourlyRate: number
): LateDeductionResult => {
  let totalLateHours = 0;
  let occurrences = 0;
  const breakdown: LateDeductionResult["breakdown"] = [];

  dtrs.forEach((dtr) => {
    if (!dtr.sessions) return;

    dtr.sessions.forEach((session, index) => {
      const scheduledStartStr = session.scheduledStartTime; // "HH:mm"

      // Skip if no schedule
      if (!scheduledStartStr || scheduledStartStr === "00:00") return;

      // Find the "work" entry for this session
      // In DTRSessionComputed, fullDTR contains the entries for that session.
      // We sort by startTime to ensure we find the earliest work entry.
      // Filter by type "work" and status "done" to match backend logic
      const workEntries = (session.fullDTR || [])
        .filter((item: any) => item.type === 'work' && item.status === 'done' && item.startTime)
        .sort((a: any, b: any) => {
          const timeA = a.startTime ? moment(a.startTime, "HH:mm").valueOf() : 0;
          const timeB = b.startTime ? moment(b.startTime, "HH:mm").valueOf() : 0;
          return timeA - timeB;
        });

      const workEntry = workEntries[0];

      if (!workEntry || !workEntry.startTime) return;

      const scheduledStart = moment(scheduledStartStr, "HH:mm");
      const actualStart = moment(workEntry.startTime, "HH:mm");

      // Calculate difference in minutes
      // We assume strictly same-day comparisons for standard shifts
      // If actual is before scheduled, diff is negative (early), so ignored
      const diffMinutes = actualStart.diff(scheduledStart, "minutes");

      // Rule 1: Threshold >= 30 minutes
      // < 30 mins: 0 deduction
      // >= 30 mins: deduction starts
      if (diffMinutes < 30) {
        return; // No deduction
      }

      if (diffMinutes >= 30) {
        // Rule 2: Hourly rounding (ceil)
        // 30 mins -> 1 hour
        // 1h 20m -> 2 hours
        const deductionHours = Math.ceil(diffMinutes / 60);
        const amount = deductionHours * hourlyRate;

        totalLateHours += deductionHours;
        occurrences++;
        breakdown.push({
          date: dtr.date,
          session: session.label || (index === 0 ? "First session" : "Second session"),
          lateMinutes: diffMinutes,
          deductionHours,
          amount,
          actualTime: workEntry.startTime,
          scheduledTime: scheduledStartStr
        });
      }
    });
  });

  return {
    deductionAmount: totalLateHours * hourlyRate,
    totalLateHours,
    occurrences,
    breakdown
  };
};

export interface RegularHoursResult {
  regularHours: number;
  excessHours: number;
}

/**
 * Calculates total regular hours and excess hours based on the following rules:
 * 1. Counts both "work" and "on trip" durations (if trip not rejected).
 * 2. Regular hours per day are capped at 8 hours (480 minutes).
 * 3. Any duration beyond 8 hours is counted as excess hours.
 */
export const calculateRegularHours = (
  dtrs: DTRDocLite[]
): RegularHoursResult => {
  let totalRegularHours = 0;
  let totalExcessHours = 0;

  dtrs.forEach((dtr) => {
    let dailyMinutes = 0;
    if (!dtr.sessions) return;

    dtr.sessions.forEach((session) => {
      if (!session.fullDTR) return;

      session.fullDTR.forEach((entry) => {
        // Only count "done" entries
        if (entry.status !== "done") return;

        // Include "work" and "on trip" (if not explicitly rejected)
        const isWork = entry.type === "work";
        const isOnTrip = entry.type === "on trip" && entry.approvalStatus !== "rejected";

        if (isWork || isOnTrip) {
          if (entry.duration) {
            // duration format: "HH:mm"
            const parts = entry.duration.split(":");
            if (parts.length === 2) {
              const hours = parseInt(parts[0], 10) || 0;
              const mins = parseInt(parts[1], 10) || 0;
              dailyMinutes += hours * 60 + mins;
            }
          }
        }
      });
    });

    // Rule: Max 8 hours (480 minutes) per day for regular work
    const regularMinutes = Math.min(dailyMinutes, 480);
    const excessMinutes = Math.max(0, dailyMinutes - 480);

    totalRegularHours += regularMinutes / 60;
    totalExcessHours += excessMinutes / 60;
  });

  return {
    regularHours: totalRegularHours,
    excessHours: totalExcessHours,
  };
};
