import moment from "moment";
import DTR from "src/models/global/dtr.model";
import {
  mapSessionsToDTRSessions,
  normalizeMealStarts,
} from "src/utils/global/schedule/schedule-helpers";
import { ISession } from "../../../types/global/schedule/schedule.type";

export const clampMealStartsToWindow = (
  mealStarts: string[] = [],
  start: string,
  end: string
) => {
  const s = moment(start, "HH:mm");
  let e = moment(end, "HH:mm");

  // Handle overnight shift: if end <= start, assume it ends the next day
  if (e.isSameOrBefore(s)) {
    e.add(1, "day");
  }

  return normalizeMealStarts(mealStarts).filter((ms) => {
    let m = moment(ms, "HH:mm");
    // If meal time is "early morning" (e.g., 02:00) but start is "late night" (e.g., 22:00),
    // treat meal as next day.
    if (m.isBefore(s)) {
      m.add(1, "day");
    }
    return m.isSameOrAfter(s) && m.isBefore(e);
  });
};

export const ensureDTRSync = async (
  userId: string,
  date: string,
  sessions: ISession[]
) => {
  const dtr = await DTR.findOne({ userId, date });
  const dtrSessions = mapSessionsToDTRSessions(
    sessions.map((s) => ({
      label: s.label,
      workCredits: s.workCredits,
      breakCredits: s.breakCredits,
      breakCount: s.breakCount,
      mealCredits: s.mealCredits,
      mealCount: s.mealCount,
      scheduledStartTime: s.scheduledStartTime,
      scheduledEndTime: s.scheduledEndTime,
      startMealTime: s.startMealTime,
      fullSched: s.fullSched,
    }))
  );

  if (dtr) {
    await DTR.updateOne({ userId, date }, { $set: { sessions: dtrSessions } });
  } else {
    await DTR.create({ userId, date, sessions: dtrSessions });
  }
};
