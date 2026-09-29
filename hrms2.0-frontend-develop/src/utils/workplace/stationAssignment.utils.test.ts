import { describe, it, expect } from 'vitest';
import { timeToMinutes, timeSlotsOverlap } from './stationAssignment.utils';

describe('stationAssignment.utils', () => {
  describe('timeToMinutes', () => {
    it('should convert "00:00" to 0', () => {
      expect(timeToMinutes("00:00")).toBe(0);
    });

    it('should convert "01:00" to 60', () => {
      expect(timeToMinutes("01:00")).toBe(60);
    });

    it('should convert "01:30" to 90', () => {
      expect(timeToMinutes("01:30")).toBe(90);
    });

    it('should convert "23:59" to 1439', () => {
      expect(timeToMinutes("23:59")).toBe(1439);
    });

    it('should handle single digit hours "9:00"', () => {
      expect(timeToMinutes("9:00")).toBe(540);
    });

    it('should return 0 for invalid input', () => {
       // Depending on implementation, it might return NaN or 0. 
       // Based on implementation: (hours || 0) * 60 + (minutes || 0)
       // "invalid".split(":") -> ["invalid"] -> [NaN] -> NaN * 60 -> NaN
       // Wait, Number("invalid") is NaN. NaN || 0 is 0? No, NaN is falsy.
       // Let's verify implementation logic mentally:
       // const [hours, minutes] = time.split(":").map(Number);
       // "invalid" -> ["invalid"] -> map(Number) -> [NaN]
       // hours = NaN, minutes = undefined
       // (NaN || 0) -> 0. (undefined || 0) -> 0.
       // Result 0.
       expect(timeToMinutes("invalid")).toBe(0);
    });
  });

  describe('timeSlotsOverlap', () => {
    it('should return false for non-overlapping slots (sequential)', () => {
      // 09:00-10:00 vs 10:00-11:00
      expect(timeSlotsOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
    });

    it('should return false for non-overlapping slots (gap)', () => {
      // 09:00-10:00 vs 10:30-11:30
      expect(timeSlotsOverlap("09:00", "10:00", "10:30", "11:30")).toBe(false);
    });

    it('should return false for non-overlapping slots (before)', () => {
      // 09:00-10:00 vs 08:00-09:00
      expect(timeSlotsOverlap("09:00", "10:00", "08:00", "09:00")).toBe(false);
    });

    it('should return true for partial overlap (start inside)', () => {
      // 09:00-10:00 vs 09:30-10:30
      expect(timeSlotsOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
    });

    it('should return true for partial overlap (end inside)', () => {
      // 09:00-10:00 vs 08:30-09:30
      expect(timeSlotsOverlap("09:00", "10:00", "08:30", "09:30")).toBe(true);
    });

    it('should return true for full containment (inside)', () => {
      // 09:00-10:00 vs 09:15-09:45
      expect(timeSlotsOverlap("09:00", "10:00", "09:15", "09:45")).toBe(true);
    });

    it('should return true for full containment (enveloping)', () => {
      // 09:00-10:00 vs 08:00-11:00
      expect(timeSlotsOverlap("09:00", "10:00", "08:00", "11:00")).toBe(true);
    });

    it('should return true for exact match', () => {
      // 09:00-10:00 vs 09:00-10:00
      expect(timeSlotsOverlap("09:00", "10:00", "09:00", "10:00")).toBe(true);
    });
    
    it('should handle cross-day boundaries (e.g. 15:00 to 00:00)', () => {
        // Test case for "Mid-shift" 15:00 to 00:00 (next day)
        // 15:00 = 900 min
        // 00:00 = 0 min -> treated as 1440 min
        
        // Case 1: Overlapping with 23:00-02:00
        // 23:00 = 1380
        // 02:00 = 120 -> 1560
        // Range 1: 900 - 1440
        // Range 2: 1380 - 1560
        // Overlap should be true (1380 < 1440 && 900 < 1560)
        expect(timeSlotsOverlap("15:00", "00:00", "23:00", "02:00")).toBe(true);

        // Case 2: No overlap with 01:00-05:00 (next day)
        // Range 1: 900 - 1440
        // Range 2: 01:00 (60) - 05:00 (300).
        // Note: The function compares ranges. 
        // If the second slot is effectively "tomorrow", the utility might not know unless dates are involved.
        // BUT, timeSlotsOverlap assumes same day context usually, or just raw time ranges.
        // If inputs are purely time strings, "01:00" is 60.
        // 900-1440 vs 60-300. No overlap.
        expect(timeSlotsOverlap("15:00", "00:00", "01:00", "05:00")).toBe(false);
    });

    it('should handle cross-day shift overlapping with next morning shift', () => {
        // Mid-shift: 15:00 - 00:00 (900 - 1440)
        // Next morning: 00:00 - 09:00 (0 - 540)
        // These touch at 00:00/1440. Should be false (non-overlapping).
        expect(timeSlotsOverlap("15:00", "00:00", "00:00", "09:00")).toBe(false);
    });

    it('should handle cross-day shift overlapping with late night shift', () => {
        // Mid-shift: 15:00 - 00:00 (900 - 1440)
        // Late night: 23:00 - 07:00 (1380 - 1860)
        // Overlap: 23:00-00:00. True.
        expect(timeSlotsOverlap("15:00", "00:00", "23:00", "07:00")).toBe(true);
    });
  });
});
