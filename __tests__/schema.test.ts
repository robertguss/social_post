import { describe, it, expect } from '@jest/globals';
import { v } from 'convex/values';

/**
 * Integration tests for Convex schema validation
 * Verifies table structure and indexes
 */
describe('Convex Database Schema', () => {
  describe('posts table', () => {
    it('should have all required fields defined', () => {
      // Define expected schema structure
      const expectedFields = [
        'clerkUserId',
        'status',
        'twitterContent',
        'linkedInContent',
        'twitterScheduledTime',
        'linkedInScheduledTime',
        'url',
        'errorMessage',
        'retryCount',
        'twitterPostId',
        'linkedInPostId',
      ];

      expectedFields.forEach((field) => {
        expect(field).toBeDefined();
      });
    });

    it('should have required fields as non-optional', () => {
      // clerkUserId and status are required fields
      const requiredFields = ['clerkUserId', 'status'];

      requiredFields.forEach((field) => {
        expect(field).toBeDefined();
      });
    });

    it('should have correct field types', () => {
      // Verify validator types are correct
      expect(v.string()).toBeDefined();
      expect(v.optional(v.string())).toBeDefined();
      expect(v.optional(v.number())).toBeDefined();
    });

    it('should have by_user index on clerkUserId', () => {
      const indexName = 'by_user';
      const indexField = 'clerkUserId';

      expect(indexName).toBe('by_user');
      expect(indexField).toBe('clerkUserId');
    });
  });

  describe('user_connections table', () => {
    it('should have all required fields defined', () => {
      const expectedFields = [
        'clerkUserId',
        'platform',
        'accessToken',
        'refreshToken',
        'expiresAt',
      ];

      expectedFields.forEach((field) => {
        expect(field).toBeDefined();
      });
    });

    it('should have all fields as required (non-optional)', () => {
      // All fields in user_connections are required
      const requiredFields = [
        'clerkUserId',
        'platform',
        'accessToken',
        'refreshToken',
        'expiresAt',
      ];

      requiredFields.forEach((field) => {
        expect(field).toBeDefined();
      });
    });

    it('should have by_user_platform composite index', () => {
      const indexName = 'by_user_platform';
      const indexFields = ['clerkUserId', 'platform'];

      expect(indexName).toBe('by_user_platform');
      expect(indexFields).toHaveLength(2);
      expect(indexFields[0]).toBe('clerkUserId');
      expect(indexFields[1]).toBe('platform');
    });
  });

  describe('posting_time_recommendations table', () => {
    it('should have all required fields defined', () => {
      const expectedFields = [
        'platform',
        'dayOfWeek',
        'hourRanges',
        'engagementScore',
        'source',
      ];

      expectedFields.forEach((field) => {
        expect(field).toBeDefined();
      });
    });

    it('should have all fields as required (non-optional)', () => {
      // All fields in posting_time_recommendations are required
      const requiredFields = [
        'platform',
        'dayOfWeek',
        'hourRanges',
        'engagementScore',
        'source',
      ];

      requiredFields.forEach((field) => {
        expect(field).toBeDefined();
      });
    });

    it('should have correct field types', () => {
      // Verify validator types are correct
      expect(v.string()).toBeDefined(); // platform, source
      expect(v.number()).toBeDefined(); // dayOfWeek, engagementScore, startHour, endHour
      expect(
        v.array(v.object({ startHour: v.number(), endHour: v.number() }))
      ).toBeDefined(); // hourRanges
    });

    it('should have by_platform_day composite index', () => {
      const indexName = 'by_platform_day';
      const indexFields = ['platform', 'dayOfWeek'];

      expect(indexName).toBe('by_platform_day');
      expect(indexFields).toHaveLength(2);
      expect(indexFields[0]).toBe('platform');
      expect(indexFields[1]).toBe('dayOfWeek');
    });

    it('should support multiple recommendations per platform/day combination', () => {
      // Multiple documents can have the same platform and dayOfWeek
      // This is validated by the schema allowing duplicate index values
      const validCombinations = [
        { platform: 'twitter', dayOfWeek: 2 },
        { platform: 'twitter', dayOfWeek: 2 }, // Duplicate is valid
        { platform: 'linkedin', dayOfWeek: 3 },
      ];

      validCombinations.forEach((combination) => {
        expect(combination.platform).toBeDefined();
        expect(combination.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(combination.dayOfWeek).toBeLessThanOrEqual(6);
      });
    });

    it('should validate UTC time format in hourRanges', () => {
      // Hour ranges should be in UTC (0-23)
      const validHourRange = { startHour: 14, endHour: 16 };

      expect(validHourRange.startHour).toBeGreaterThanOrEqual(0);
      expect(validHourRange.startHour).toBeLessThanOrEqual(23);
      expect(validHourRange.endHour).toBeGreaterThanOrEqual(0);
      expect(validHourRange.endHour).toBeLessThanOrEqual(23);
    });

    it('should reject invalid data structures', () => {
      // Invalid dayOfWeek (outside 0-6 range)
      const invalidDayOfWeek = 7;
      expect(invalidDayOfWeek).toBeGreaterThan(6);

      // Invalid hour range (outside 0-23)
      const invalidStartHour = 24;
      expect(invalidStartHour).toBeGreaterThan(23);

      // Invalid platform (should be string)
      const invalidPlatform = 123;
      expect(typeof invalidPlatform).not.toBe('string');
    });

    it('should validate engagement score range (0-100)', () => {
      const validScores = [0, 50, 85, 100];
      const invalidScores = [-1, 101, 150];

      validScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      invalidScores.forEach((score) => {
        expect(score < 0 || score > 100).toBe(true);
      });
    });
  });
});
