import DTR from "../../models/global/dtr.model";
import { normalizeDate, hhmmToMin, minToHHMM } from "./time.utils";
import { startTagText, endTagText } from "./dtr/dtr-helper";

/**
 * Repairs active or today's DTR entries that were recorded in UTC on the VPS
 * prior to Asia/Manila timezone configuration.
 *
 * Example: Employee with an 08:00 shift clocking in at 10:02 AM Manila time
 * was saved as 02:02 UTC with tag "Early 5 Hours And 58 Minutes".
 * This adjusts it to 10:02 Manila time with tag "Late 2 Hours And 2 Minutes".
 */
export async function repairUtcActiveEntries(): Promise<void> {
  try {
    const today = normalizeDate();
    const dtrs = await DTR.find({
      $or: [{ date: today }, { "sessions.fullDTR.status": "active" }],
    });

    let repairedEntriesCount = 0;

    for (const dtr of dtrs) {
      let docModified = false;

      for (const session of dtr.sessions || []) {
        const schedStartMin = hhmmToMin(session.scheduledStartTime || "08:00");

        for (const entry of session.fullDTR || []) {
          if (!entry.startTime) continue;
          const startMin = hhmmToMin(entry.startTime);

          // If scheduled shift starts in the morning/day (>= 06:00), but entry was logged
          // between 00:00 and 05:59 and marked as "Early", it was captured in UTC (+8 hrs behind).
          const isEarlyGlitch =
            schedStartMin >= 360 &&
            startMin < 360 &&
            (entry.startTag || "").toLowerCase().includes("early");

          if (isEarlyGlitch) {
            const newStartMin = startMin + 480;
            const newStartTime = minToHHMM(newStartMin);
            const anchor =
              entry.type === "meal" ? session.startMealTime : session.scheduledStartTime;

            console.log(
              `[REPAIR-UTC] Adjusting userId=${dtr.userId} entry ${entry.type} startTime ${entry.startTime} -> ${newStartTime}`
            );

            entry.startTime = newStartTime;
            entry.startTag = startTagText(newStartTime, anchor);

            if (entry.endTime) {
              const endMin = hhmmToMin(entry.endTime);
              if (endMin < 360) {
                const newEndTime = minToHHMM(endMin + 480);
                entry.endTime = newEndTime;
                entry.endTag = endTagText(newEndTime, session.scheduledEndTime);
              }
            }

            docModified = true;
            repairedEntriesCount++;
          }
        }
      }

      if (docModified) {
        dtr.markModified("sessions");
        await dtr.save();
      }
    }

    if (repairedEntriesCount > 0) {
      console.log(
        `[REPAIR-UTC] Successfully repaired ${repairedEntriesCount} UTC entries to Asia/Manila.`
      );
    }
  } catch (err) {
    console.error("[REPAIR-UTC] Failed to run UTC repair routine:", err);
  }
}
