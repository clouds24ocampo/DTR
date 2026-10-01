import cron from "node-cron";
import mongoose from "mongoose";
import Schedule from "src/models/global/schedule.model";
import { autoEndDTRItemService } from "./services/global/dtr/dtr.service";
import { normalizeDate } from "./utils/global/time.utils";

cron.schedule("* * * * *", async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log("[AUTO-END] Skipped: MongoDB not connected");
    return;
  }
  const today = normalizeDate();

  try {
    const schedules = await Schedule.find({ date: today }).select("userId");

    if (!schedules.length) {
      console.log(`[AUTO-END] No schedules found for date=${today}`);
      return;
    }

    for (const sched of schedules) {
      try {
        const result = await autoEndDTRItemService({
          userId: sched.userId.toString(),
          date: today,
        });

        console.log(
          `[AUTO-END] userId=${sched.userId} date=${today} → ${result.message}`
        );
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const message = err instanceof Error ? err.message : String(err);
        if (status === 404) {
          console.log(`[AUTO-END] userId=${sched.userId} date=${today} → skip: ${message}`);
        } else {
          console.error("[AUTO-END] Failed for", sched.userId, err);
        }
      }
    }
  } catch (err) {
    console.error("[AUTO-END] Cron job error:", err);
  }
});
