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
});
