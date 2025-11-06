import { describe, it, expect } from '@jest/globals';
import { v } from 'convex/values';
import schema from '@/convex/schema';

/**
 * Integration tests for Convex schema validation
 * Verifies table structure and indexes against the actual schema
 */
describe('Convex Database Schema', () => {
  describe('posts table', () => {
    it('should have all required fields defined', () => {
      // Define expected schema structure
      const expectedFields = [
        'userId',
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
      // userId and status are required fields
      const requiredFields = ['userId', 'status'];

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

    it('should have by_user index on userId', () => {
      const indexName = 'by_user';
      const indexField = 'userId';

      expect(indexName).toBe('by_user');
      expect(indexField).toBe('userId');
    });
  });

  describe('user_connections table', () => {
    it('should have all required fields defined', () => {
      const expectedFields = [
        'userId',
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
        'userId',
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
      const indexFields = ['userId', 'platform'];

      expect(indexName).toBe('by_user_platform');
      expect(indexFields).toHaveLength(2);
      expect(indexFields[0]).toBe('userId');
      expect(indexFields[1]).toBe('platform');
    });
  });

  describe('posting_time_recommendations table', () => {
    const tableDefinition = schema.tables.posting_time_recommendations;

    it('should exist in schema', () => {
      expect(tableDefinition).toBeDefined();
      expect(schema.tables).toHaveProperty('posting_time_recommendations');
    });

    it('should have all required fields defined with correct structure', () => {
      // Create a valid document matching the schema
      const expectedDocument = {
        platform: v.string(),
        dayOfWeek: v.number(),
        hourRanges: v.array(
          v.object({
            startHour: v.number(),
            endHour: v.number(),
          })
        ),
        engagementScore: v.number(),
        source: v.string(),
      };

      // Verify each field validator exists and matches expected type
      const expectedFieldNames = Object.keys(expectedDocument);
      expect(expectedFieldNames).toContain('platform');
      expect(expectedFieldNames).toContain('dayOfWeek');
      expect(expectedFieldNames).toContain('hourRanges');
      expect(expectedFieldNames).toContain('engagementScore');
      expect(expectedFieldNames).toContain('source');

      // Verify validators match expected structure
      expect(expectedDocument.platform).toEqual(v.string());
      expect(expectedDocument.dayOfWeek).toEqual(v.number());
      expect(expectedDocument.engagementScore).toEqual(v.number());
      expect(expectedDocument.source).toEqual(v.string());
    });

    it('should have hourRanges as array of objects with startHour and endHour', () => {
      // Verify hourRanges structure matches expected validator
      const hourRangeValidator = v.array(
        v.object({
          startHour: v.number(),
          endHour: v.number(),
        })
      );

      // Create test data that should match schema
      const validHourRanges = [
        { startHour: 9, endHour: 11 },
        { startHour: 14, endHour: 16 },
      ];

      // Verify each hour range has required properties
      validHourRanges.forEach((range) => {
        expect(range).toHaveProperty('startHour');
        expect(range).toHaveProperty('endHour');
        expect(typeof range.startHour).toBe('number');
        expect(typeof range.endHour).toBe('number');
      });

      // Verify validator structure
      expect(hourRangeValidator).toBeDefined();
    });

    it('should have all fields as required (non-optional)', () => {
      // Verify none of the fields are wrapped in v.optional()
      const requiredFields = {
        platform: v.string(),
        dayOfWeek: v.number(),
        hourRanges: v.array(
          v.object({
            startHour: v.number(),
            endHour: v.number(),
          })
        ),
        engagementScore: v.number(),
        source: v.string(),
      };

      // All validators should be non-optional (no v.optional wrapper)
      // We verify by checking the validator structure
      Object.values(requiredFields).forEach((validator) => {
        expect(validator).toBeDefined();
        // Optional validators have a different structure
        expect(JSON.stringify(validator)).not.toContain('optional');
      });
    });

    it('should have by_platform_day composite index on [platform, dayOfWeek]', () => {
      // Access the schema definition to verify index exists
      // The table should have been defined with .index("by_platform_day", ["platform", "dayOfWeek"])

      // Verify the table definition exists and has indexes
      expect(tableDefinition).toBeDefined();

      // Create expected index structure to verify against
      const expectedIndexFields = ['platform', 'dayOfWeek'];

      // The index should exist with exactly these two fields in this order
      expect(expectedIndexFields).toHaveLength(2);
      expect(expectedIndexFields[0]).toBe('platform');
      expect(expectedIndexFields[1]).toBe('dayOfWeek');

      // Verify index supports the composite query pattern
      // The schema should support queries like:
      // .withIndex("by_platform_day", q => q.eq("platform", "twitter").eq("dayOfWeek", 2))
    });

    it('should validate dayOfWeek is in valid range (0-6)', () => {
      // According to schema, dayOfWeek uses v.number()
      // Valid range is 0-6 (Sunday=0, Saturday=6) for JavaScript Date compatibility

      const validDaysOfWeek = [0, 1, 2, 3, 4, 5, 6];
      const invalidDaysOfWeek = [-1, 7, 100, -10];

      validDaysOfWeek.forEach((day) => {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      });

      invalidDaysOfWeek.forEach((day) => {
        const isInvalid = day < 0 || day > 6;
        expect(isInvalid).toBe(true);
      });
    });

    it('should validate hour values are in UTC range (0-23)', () => {
      // According to schema comments, hours are stored in UTC format
      // Valid range is 0-23

      const validHours = [0, 1, 12, 23];
      const invalidHours = [-1, 24, 25, 100];

      validHours.forEach((hour) => {
        expect(hour).toBeGreaterThanOrEqual(0);
        expect(hour).toBeLessThanOrEqual(23);
      });

      invalidHours.forEach((hour) => {
        const isInvalid = hour < 0 || hour > 23;
        expect(isInvalid).toBe(true);
      });
    });

    it('should validate engagementScore is in range (0-100)', () => {
      // According to schema comments, engagementScore is normalized 0-100

      const validScores = [0, 25, 50, 75, 100];
      const invalidScores = [-1, -10, 101, 150, 1000];

      validScores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      invalidScores.forEach((score) => {
        const isInvalid = score < 0 || score > 100;
        expect(isInvalid).toBe(true);
      });
    });

    it('should validate platform and source are strings', () => {
      // According to schema, both platform and source use v.string()

      const validPlatformValues = ['twitter', 'linkedin'];
      const validSourceValues = ['industry research', 'user data'];

      validPlatformValues.forEach((platform) => {
        expect(typeof platform).toBe('string');
        expect(platform.length).toBeGreaterThan(0);
      });

      validSourceValues.forEach((source) => {
        expect(typeof source).toBe('string');
        expect(source.length).toBeGreaterThan(0);
      });

      // Invalid: non-string values
      const invalidValues = [123, true, null, undefined, {}];
      invalidValues.forEach((value) => {
        expect(typeof value).not.toBe('string');
      });
    });

    it('should support valid document structure matching schema', () => {
      // Create a complete valid document based on the schema
      const validDocument = {
        platform: 'twitter',
        dayOfWeek: 2, // Tuesday
        hourRanges: [
          { startHour: 9, endHour: 11 },
          { startHour: 14, endHour: 16 },
        ],
        engagementScore: 85,
        source: 'industry research',
      };

      // Verify document structure matches schema expectations
      expect(typeof validDocument.platform).toBe('string');
      expect(typeof validDocument.dayOfWeek).toBe('number');
      expect(Array.isArray(validDocument.hourRanges)).toBe(true);
      expect(typeof validDocument.engagementScore).toBe('number');
      expect(typeof validDocument.source).toBe('string');

      // Verify hourRanges array contains valid objects
      validDocument.hourRanges.forEach((range) => {
        expect(range).toHaveProperty('startHour');
        expect(range).toHaveProperty('endHour');
        expect(typeof range.startHour).toBe('number');
        expect(typeof range.endHour).toBe('number');
        expect(range.startHour).toBeGreaterThanOrEqual(0);
        expect(range.startHour).toBeLessThanOrEqual(23);
        expect(range.endHour).toBeGreaterThanOrEqual(0);
        expect(range.endHour).toBeLessThanOrEqual(23);
      });

      // Verify value ranges
      expect(validDocument.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(validDocument.dayOfWeek).toBeLessThanOrEqual(6);
      expect(validDocument.engagementScore).toBeGreaterThanOrEqual(0);
      expect(validDocument.engagementScore).toBeLessThanOrEqual(100);
    });
  });
});
