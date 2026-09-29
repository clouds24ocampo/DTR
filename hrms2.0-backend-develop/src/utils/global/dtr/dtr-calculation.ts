import { DTRSessionComputed } from "src/models/global/dtr.model";

const parseDurationToMinutes = (duration: string): number => {
  const [h, m] = duration.split(":").map(Number);
  return h * 60 + m;
};

const formatMinutesToHHMM = (minutes: number): string => {
  const h = Math.floor(Math.max(minutes, 0) / 60);
  const m = Math.max(minutes, 0) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const calculateSessionTotals = (session: DTRSessionComputed) => {
  let workUsed = 0;
  let breakUsed = 0;
  let mealUsed = 0;

  let breakCountUsed = 0;
  let mealCountUsed = 0;

  for (const item of session.fullDTR) {
    if (!item.duration || item.duration === "--" || item.status !== "done")
      continue;

    const mins = parseDurationToMinutes(item.duration);

    if (item.type === "work") {
      workUsed += mins;
    } else if (item.type === "break") {
      breakUsed += mins;
      breakCountUsed++;
    } else if (item.type === "meal") {
      mealUsed += mins;
      mealCountUsed++;
    }
  }

  const workCredits = parseDurationToMinutes(session.workCredits);
  const breakCredits = parseDurationToMinutes(session.breakCredits);
  const mealCredits = parseDurationToMinutes(session.mealCredits);

  // Treat break time as paid working time up to a maximum of 30 minutes
  const MAX_PAID_BREAK_MINUTES = 30;
  const paidBreakMinutes = Math.min(breakUsed, MAX_PAID_BREAK_MINUTES);
  const effectiveWorkMinutes = workUsed + paidBreakMinutes;

  return {
    // DTRTotalWork represents compensated work, which includes
    // actual work plus up to 30 minutes of break time.
    DTRTotalWork: formatMinutesToHHMM(effectiveWorkMinutes),
    DTRTotalBreak: formatMinutesToHHMM(breakUsed),
    DTRTotalMeal: formatMinutesToHHMM(mealUsed),
    updatedWorkCredits: formatMinutesToHHMM(workCredits - workUsed),
    updatedBreakCredits: formatMinutesToHHMM(breakCredits - breakUsed),
    updatedMealCredits: formatMinutesToHHMM(mealCredits - mealUsed),
    updatedBreakCount: Math.max(session.breakCount - breakCountUsed, 0),
    updatedMealCount: Math.max(session.mealCount - mealCountUsed, 0),
  };
};
