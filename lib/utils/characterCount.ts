/**
 * Character counting utilities for platform-specific content validation.
 *
 * Twitter/X Rules:
 * - Maximum: 280 characters
 * - URLs: All URLs are shortened via t.co and count as 23 characters regardless of actual length
 * - Emoji: Most emoji count as 2 characters (surrogate pairs), some newer emoji may vary
 * - Line breaks: Count as 1 character
 *
 * LinkedIn Rules:
 * - Maximum: 3,000 characters
 * - URLs: Count as their actual character length (no shortening)
 * - Emoji: Most emoji count as 1 character
 * - Line breaks: Count as 1 character
 */

/**
 * Regular expression to detect URLs in content.
 * Matches http:// and https:// URLs.
 */
const URL_REGEX = /https?:\/\/[^\s]+/g;

/**
 * Twitter's t.co URL shortener length.
 * As of Twitter API v2, all URLs are counted as 23 characters.
 * This applies to both http and https URLs.
 */
const TWITTER_SHORT_URL_LENGTH = 23;

/**
 * Counts characters for Twitter/X, accounting for t.co URL shortening.
 * All URLs are counted as 23 characters regardless of their actual length.
 *
 * @param content - The text content to count
 * @returns The character count according to Twitter's rules
 *
 * @example
 * ```typescript
 * getTwitterCharacterCount("Hello world"); // 11
 * getTwitterCharacterCount("Check this out: https://example.com/very/long/url"); // 16 + 23 = 39
 * getTwitterCharacterCount("Hello 👋"); // Twitter counts most emoji as 2 chars
 * ```
 */
export function getTwitterCharacterCount(content: string): number {
  if (!content) return 0;

  // Replace all URLs with a placeholder of TWITTER_SHORT_URL_LENGTH characters
  const contentWithShortUrls = content.replace(
    URL_REGEX,
    'x'.repeat(TWITTER_SHORT_URL_LENGTH)
  );

  // Use Array.from() to properly count Unicode characters including emoji
  // This handles surrogate pairs correctly (most emoji)
  return Array.from(contentWithShortUrls).length;
}

/**
 * Counts characters for LinkedIn, using actual character count.
 * URLs count as their full length, not shortened.
 *
 * @param content - The text content to count
 * @returns The character count according to LinkedIn's rules
 *
 * @example
 * ```typescript
 * getLinkedInCharacterCount("Hello world"); // 11
 * getLinkedInCharacterCount("Check this out: https://example.com"); // 36
 * getLinkedInCharacterCount("Hello 👋"); // 8 (most emoji count as 1 char on LinkedIn)
 * ```
 */
export function getLinkedInCharacterCount(content: string): number {
  if (!content) return 0;

  // Use Array.from() to properly count Unicode characters
  return Array.from(content).length;
}

/**
 * Platform-specific character limits.
 */
export const CHARACTER_LIMITS = {
  twitter: {
    max: 280,
    warning: 260,
  },
  linkedin: {
    max: 3000,
    warning: 2900,
  },
} as const;

/**
 * Validates if content is within the character limit for a specific platform.
 *
 * @param content - The text content to validate
 * @param platform - The platform to validate against ('twitter' | 'linkedin')
 * @returns Object with isValid boolean and current character count
 *
 * @example
 * ```typescript
 * validateCharacterCount("Hello world", "twitter");
 * // { isValid: true, count: 11, maxCount: 280 }
 *
 * validateCharacterCount("x".repeat(300), "twitter");
 * // { isValid: false, count: 300, maxCount: 280 }
 * ```
 */
export function validateCharacterCount(
  content: string,
  platform: 'twitter' | 'linkedin'
): {
  isValid: boolean;
  count: number;
  maxCount: number;
  isWarning: boolean;
} {
  const count =
    platform === 'twitter'
      ? getTwitterCharacterCount(content)
      : getLinkedInCharacterCount(content);

  const { max, warning } = CHARACTER_LIMITS[platform];

  return {
    isValid: count <= max,
    count,
    maxCount: max,
    isWarning: count >= warning && count < max,
  };
}
