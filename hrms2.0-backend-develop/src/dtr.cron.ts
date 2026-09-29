import cron from "node-cron";
import Schedule from "src/models/global/schedule.model";
import { autoEndDTRItemService } from "./services/global/dtr/dtr.service";
import { normalizeDate } from "./utils/global/time.utils";

cron.schedule("* * * * *", async () => {
  const today = normalizeDate(new Date().toISOString().slice(0, 10));

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
      } catch (err) {
        console.error("[AUTO-END] Failed for", sched.userId, err);
      }
    }
  } catch (err) {
    console.error("[AUTO-END] Cron job error:", err);
  }
});
