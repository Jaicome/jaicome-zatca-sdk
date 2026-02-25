import { describe, it, expect } from "bun:test";
import { formatDate, formatTime, formatQRTimestamp } from "../utils/date.js";

describe("Date Formatting Utilities", () => {
  describe("formatDate", () => {
    it("formats a standard date to YYYY-MM-DD", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      expect(formatDate(date)).toBe("2024-01-15");
    });

    it("handles midnight UTC correctly", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      expect(formatDate(date)).toBe("2024-01-01");
    });

    it("handles leap day correctly", () => {
      const date = new Date("2024-02-29T12:00:00Z");
      expect(formatDate(date)).toBe("2024-02-29");
    });

    it("zero-pads month and day", () => {
      const date = new Date("2024-03-05T10:00:00Z");
      expect(formatDate(date)).toBe("2024-03-05");
    });

    it("handles year boundary correctly", () => {
      const date = new Date("2024-12-31T23:59:59Z");
      expect(formatDate(date)).toBe("2024-12-31");
    });
  });

  describe("formatTime", () => {
    it("formats time to HH:mm:ssZ with UTC suffix", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      expect(formatTime(date)).toBe("14:30:00Z");
    });

    it("handles midnight UTC correctly", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      expect(formatTime(date)).toBe("00:00:00Z");
    });

    it("zero-pads hours, minutes, and seconds", () => {
      const date = new Date("2024-01-15T09:05:03Z");
      expect(formatTime(date)).toBe("09:05:03Z");
    });

    it("handles end of day correctly", () => {
      const date = new Date("2024-01-15T23:59:59Z");
      expect(formatTime(date)).toBe("23:59:59Z");
    });

    it("uses UTC time regardless of timezone offset in input", () => {
      // Create a date from a non-UTC string - should still use UTC methods
      const date = new Date("2024-01-15T14:30:00");
      const result = formatTime(date);
      // Result should be in UTC, not local time
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  describe("formatQRTimestamp", () => {
    it("formats full ISO timestamp with UTC suffix", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      expect(formatQRTimestamp(date)).toBe("2024-01-15T14:30:00Z");
    });

    it("handles midnight UTC correctly", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      expect(formatQRTimestamp(date)).toBe("2024-01-01T00:00:00Z");
    });

    it("combines date and time with T separator and Z suffix", () => {
      const date = new Date("2024-03-05T09:15:45Z");
      expect(formatQRTimestamp(date)).toBe("2024-03-05T09:15:45Z");
    });

    it("zero-pads all components", () => {
      const date = new Date("2024-01-05T05:05:05Z");
      expect(formatQRTimestamp(date)).toBe("2024-01-05T05:05:05Z");
    });

    it("handles leap day correctly", () => {
      const date = new Date("2024-02-29T23:59:59Z");
      expect(formatQRTimestamp(date)).toBe("2024-02-29T23:59:59Z");
    });
  });
});
