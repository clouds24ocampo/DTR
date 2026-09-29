import {
  assertStartBeforeEnd,
  generateFullSchedule,
} from "./schedule-helpers";
import moment from "moment";

describe("Schedule Helpers - Overnight Support", () => {
  describe("assertStartBeforeEnd", () => {
    it("should allow standard intraday range", () => {
      expect(() => assertStartBeforeEnd("08:00", "17:00")).not.toThrow();
    });

    it("should allow overnight range (start > end)", () => {
      expect(() => assertStartBeforeEnd("23:00", "07:00")).not.toThrow();
    });

    it("should throw if start equals end", () => {
      expect(() => assertStartBeforeEnd("08:00", "08:00")).toThrow(
        "Start time (08:00) cannot be equal to end time (08:00)."
      );
    });
  });

  describe("generateFullSchedule", () => {
    it("should generate schedule for overnight shift (23:00 - 07:00)", () => {
      const result = generateFullSchedule("23:00", "07:00", ["02:00"]);
      
      // Check overall duration
      // 23:00 to 07:00 is 8 hours = 480 minutes.
      // Expected breakdown depends on buildWorkWithBreaks logic.
      // Assuming dynamic breaks every 2 hours (120 min) with 15 min duration.
      // And meal at 02:00 (1 hour).
      
      // 23:00 (start)
      // Meal at 02:00.
      // So first segment: 23:00 to 02:00 (3 hours).
      // buildWorkWithBreaks("23:00", "02:00") -> 3 hours.
      // 23:00 - 01:00 (Work 2h)
      // 01:00 - 01:15 (Break 15m)
      // 01:15 - 02:00 (Work 45m)
      
      // Meal: 02:00 - 03:00 (1h)
      
      // Second segment: 03:00 to 07:00 (4 hours).
      // buildWorkWithBreaks("03:00", "07:00") -> 4 hours.
      // 03:00 - 05:00 (Work 2h)
      // 05:00 - 05:15 (Break 15m)
      // 05:15 - 07:00 (Work 1h 45m)
      
      expect(result.schedule.length).toBeGreaterThan(0);
      
      const types = result.schedule.map(b => b.type);
      expect(types).toContain("work");
      expect(types).toContain("meal");
      
      // Verify meal block
      const meal = result.schedule.find(b => b.type === "meal");
      expect(meal).toBeDefined();
      expect(meal?.start).toBe("02:00");
      expect(meal?.end).toBe("03:00");
      
      // Verify first work block
      const firstWork = result.schedule[0];
      expect(firstWork.type).toBe("work");
      expect(firstWork.start).toBe("23:00");
      // end should be 01:00 based on 2h rule
      expect(firstWork.end).toBe("01:00");
    });

    it("should handle overnight without meals", () => {
      const result = generateFullSchedule("22:00", "06:00", []);
      // 8 hours.
      // 22:00-00:00 Work
      // 00:00-00:15 Break
      // 00:15-02:15 Work
      // 02:15-02:30 Break
      // 02:30-04:30 Work
      // 04:30-04:45 Break
      // 04:45-06:00 Work
      
      expect(result.schedule.length).toBeGreaterThan(0);
      expect(result.schedule[0].start).toBe("22:00");
      expect(result.schedule[result.schedule.length - 1].end).toBe("06:00");
    });
  });
});
