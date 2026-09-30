import { ServiceError } from "../../../utils/global/error";
import { assertTimeRange, hasAgentRole, parseMealTimes, requireDate } from "./workplaceValidation";

describe("workplaceValidation", () => {
  it("requireDate trims and validates", () => {
    expect(requireDate(" 2026-01-31 ")).toBe("2026-01-31");
    expect(() => requireDate("31/01/2026")).toThrow(ServiceError);
    expect(() => requireDate(undefined)).toThrow(ServiceError);
  });

  it("assertTimeRange allows overnight but not zero-length", () => {
    expect(() => assertTimeRange("22:00", "06:00")).not.toThrow();
    expect(() => assertTimeRange("09:00", "09:00")).toThrow(ServiceError);
    expect(() => assertTimeRange("9am", "17:00")).toThrow(ServiceError);
  });

  it("parseMealTimes checks the window, de-duplicates and sorts", () => {
    expect(parseMealTimes(["13:00", "12:00", "12:00"], "09:00", "17:00")).toEqual(["12:00", "13:00"]);
    expect(() => parseMealTimes(["18:00"], "09:00", "17:00")).toThrow(ServiceError);
    expect(parseMealTimes(["23:00", "02:00"], "22:00", "06:00")).toEqual(["02:00", "23:00"]);
    expect(parseMealTimes(undefined, "09:00", "17:00")).toEqual([]);
  });

  it("hasAgentRole handles role arrays (position is an array)", () => {
    expect(hasAgentRole(["Employee", "Frontline / Agent Roles"])).toBe(true);
    expect(hasAgentRole(["Employee"])).toBe(false);
    expect(hasAgentRole(undefined)).toBe(false);
  });
});
