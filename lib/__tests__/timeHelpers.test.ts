import { addWeeks, addMonths } from "../timeHelpers";

describe("timeHelpers", () => {
  describe("addWeeks", () => {
    it("should add 1 week to a timestamp", () => {
      // January 1, 2024, 12:00:00 PM
      const timestamp = new Date("2024-01-01T12:00:00").getTime();
      const result = addWeeks(timestamp, 1);

      // Expected: January 8, 2024, 12:00:00 PM
      const expected = new Date("2024-01-08T12:00:00").getTime();
      expect(result).toBe(expected);
    });

    it("should add multiple weeks to a timestamp", () => {
      // January 1, 2024, 12:00:00 PM
      const timestamp = new Date("2024-01-01T12:00:00").getTime();
      const result = addWeeks(timestamp, 4);

      // Expected: January 29, 2024, 12:00:00 PM (4 weeks = 28 days)
      const expected = new Date("2024-01-29T12:00:00").getTime();
      expect(result).toBe(expected);
    });

    it("should subtract weeks when given negative value", () => {
      // January 15, 2024, 12:00:00 PM
      const timestamp = new Date("2024-01-15T12:00:00").getTime();
      const result = addWeeks(timestamp, -1);

      // Expected: January 8, 2024, 12:00:00 PM
      const expected = new Date("2024-01-08T12:00:00").getTime();
      expect(result).toBe(expected);
    });

    it("should preserve time when adding weeks", () => {
      // January 1, 2024, 3:45:30 PM
      const timestamp = new Date("2024-01-01T15:45:30").getTime();
      const result = addWeeks(timestamp, 2);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(15);
      expect(resultDate.getMinutes()).toBe(45);
      expect(resultDate.getSeconds()).toBe(30);
    });
  });

  describe("addMonths", () => {
    it("should add 1 month to a timestamp", () => {
      // January 15, 2024, 12:00:00 PM
      const timestamp = new Date("2024-01-15T12:00:00").getTime();
      const result = addMonths(timestamp, 1);

      // Expected: February 15, 2024, 12:00:00 PM
      const expected = new Date("2024-02-15T12:00:00").getTime();
      expect(result).toBe(expected);
    });

    it("should add 3 months to a timestamp", () => {
      // January 15, 2024, 12:00:00 PM
      const timestamp = new Date("2024-01-15T12:00:00").getTime();
      const result = addMonths(timestamp, 3);

      // Expected: April 15, 2024, 12:00:00 PM
      const expected = new Date("2024-04-15T12:00:00").getTime();
      expect(result).toBe(expected);
    });

    it("should handle month boundary edge case (Jan 31 + 1 month)", () => {
      // January 31, 2024, 12:00:00 PM
      const timestamp = new Date("2024-01-31T12:00:00").getTime();
      const result = addMonths(timestamp, 1);

      // Note: JavaScript setMonth behavior - Jan 31 + 1 month rolls over to March 2
      // This is expected JavaScript Date behavior when day doesn't exist in target month
      const resultDate = new Date(result);
      expect(resultDate.getMonth()).toBe(2); // March (0-indexed)
      expect(resultDate.getDate()).toBe(2); // Rolled over from Feb 31 -> March 2
    });

    it("should handle month boundary edge case (Jan 31 + 1 month in non-leap year)", () => {
      // January 31, 2025, 12:00:00 PM
      const timestamp = new Date("2025-01-31T12:00:00").getTime();
      const result = addMonths(timestamp, 1);

      // Note: JavaScript setMonth behavior - Jan 31 + 1 month rolls over to March 3
      // This is expected JavaScript Date behavior when day doesn't exist in target month
      const resultDate = new Date(result);
      expect(resultDate.getMonth()).toBe(2); // March (0-indexed)
      expect(resultDate.getDate()).toBe(3); // Rolled over from Feb 31 -> March 3
    });

    it("should handle leap year correctly (Feb 29 + 1 year)", () => {
      // February 29, 2024, 12:00:00 PM (leap year)
      const timestamp = new Date("2024-02-29T12:00:00").getTime();
      const result = addMonths(timestamp, 12);

      // Note: JavaScript setMonth behavior - Feb 29 + 12 months rolls over to March 1
      // because Feb 29 doesn't exist in 2025 (not a leap year)
      const resultDate = new Date(result);
      expect(resultDate.getMonth()).toBe(2); // March (0-indexed)
      expect(resultDate.getDate()).toBe(1); // Rolled over from Feb 29, 2025 -> March 1, 2025
    });

    it("should subtract months when given negative value", () => {
      // March 15, 2024, 12:00:00 PM
      const timestamp = new Date("2024-03-15T12:00:00").getTime();
      const result = addMonths(timestamp, -1);

      // Expected: February 15, 2024, 12:00:00 PM
      const expected = new Date("2024-02-15T12:00:00").getTime();
      expect(result).toBe(expected);
    });

    it("should preserve time when adding months", () => {
      // January 15, 2024, 3:45:30 PM
      const timestamp = new Date("2024-01-15T15:45:30").getTime();
      const result = addMonths(timestamp, 2);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(15);
      expect(resultDate.getMinutes()).toBe(45);
      expect(resultDate.getSeconds()).toBe(30);
    });

    it("should handle year transitions", () => {
      // November 15, 2024, 12:00:00 PM
      const timestamp = new Date("2024-11-15T12:00:00").getTime();
      const result = addMonths(timestamp, 3);

      // Expected: February 15, 2025, 12:00:00 PM
      const expected = new Date("2025-02-15T12:00:00").getTime();
      expect(result).toBe(expected);
    });
  });
});
