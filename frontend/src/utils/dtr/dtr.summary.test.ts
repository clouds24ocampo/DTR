import { describe, expect, it } from "vitest";
import { summarizeDay } from "./dtr.summary";
import type { DTRDocLite } from "../../types/global/dtr/dtr.type";

const session = (fullDTR: unknown[], work = "00:00") =>
  ({ label: "Day Shift", DTRTotalWork: work, DTRTotalBreak: "00:00", DTRTotalMeal: "00:00", fullDTR }) as never;

describe("summarizeDay", () => {
  it("reads time in/out and totals from a finished day", () => {
    const d = { userId: "u", date: "2026-10-01", sessions: [session([{ type: "work", status: "done", startTime: "08:00", endTime: "17:00", startTag: "On time", endTag: "--" }], "08:00")] } as DTRDocLite;
    expect(summarizeDay(d)).toMatchObject({ timeIn: "08:00", timeOut: "17:00", workMin: 480, active: false, hasEntries: true, late: false });
  });

  it("adds the running segment for an active day", () => {
    const d = { userId: "u", date: "2026-10-01", sessions: [session([{ type: "work", status: "active", startTime: "08:00", startTag: "Late 5 Minutes" }])] } as DTRDocLite;
    expect(summarizeDay(d, "09:30")).toMatchObject({ active: true, workMin: 90, late: true });
  });

  it("treats a session with no entries as empty", () => {
    const d = { userId: "u", date: "2026-10-01", sessions: [session([])] } as DTRDocLite;
    expect(summarizeDay(d).hasEntries).toBe(false);
  });
});
