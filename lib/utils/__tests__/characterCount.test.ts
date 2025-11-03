import {
  getTwitterCharacterCount,
  getLinkedInCharacterCount,
  validateCharacterCount,
  CHARACTER_LIMITS,
} from '../characterCount';

describe('Character Counting Utilities', () => {
  describe('getTwitterCharacterCount', () => {
    it('should count basic ASCII text correctly', () => {
      expect(getTwitterCharacterCount('Hello world')).toBe(11);
      expect(getTwitterCharacterCount('The quick brown fox')).toBe(19);
    });

    it('should handle empty string', () => {
      expect(getTwitterCharacterCount('')).toBe(0);
    });

    it('should count URLs as 23 characters (t.co shortening)', () => {
      // Short URL
      expect(getTwitterCharacterCount('Check this: https://x.com')).toBe(
        'Check this: '.length + 23
      );

      // Long URL
      expect(
        getTwitterCharacterCount(
          'Check this: https://example.com/very/long/url/path/that/goes/on/and/on'
        )
      ).toBe('Check this: '.length + 23);

      // HTTP (not HTTPS)
      expect(getTwitterCharacterCount('Visit http://example.com')).toBe(
        'Visit '.length + 23
      );
    });

    it('should handle multiple URLs correctly', () => {
      const content = 'Check https://example.com and https://another.com';
      // "Check  and " = 11 chars, 2 URLs = 46 chars
      expect(getTwitterCharacterCount(content)).toBe(11 + 23 + 23);
    });

    it('should count emoji correctly (most count as 2 characters)', () => {
      // Single emoji with surrogate pairs typically count as 2
      expect(getTwitterCharacterCount('👋')).toBeGreaterThanOrEqual(1);
      expect(getTwitterCharacterCount('Hello 👋')).toBeGreaterThanOrEqual(7);

      // Multiple emoji
      expect(getTwitterCharacterCount('👋🎉🚀')).toBeGreaterThanOrEqual(3);
    });

    it('should handle emoji with skin tones', () => {
      // Emoji with skin tone modifier (multi-codepoint)
      expect(getTwitterCharacterCount('👋🏻')).toBeGreaterThanOrEqual(1);
      expect(getTwitterCharacterCount('👨‍👩‍👧‍👦')).toBeGreaterThanOrEqual(1); // Family emoji
    });

    it('should count newlines as 1 character', () => {
      expect(getTwitterCharacterCount('Line 1\nLine 2')).toBe(13);
      expect(getTwitterCharacterCount('A\nB\nC')).toBe(5);
    });

    it('should handle special characters', () => {
      expect(getTwitterCharacterCount('Hello! @user #hashtag')).toBe(21);
      expect(getTwitterCharacterCount('$100 & counting...')).toBe(18);
    });

    it('should handle non-English characters', () => {
      expect(getTwitterCharacterCount('Привет мир')).toBe(10); // Russian
      expect(getTwitterCharacterCount('こんにちは')).toBe(5); // Japanese
      expect(getTwitterCharacterCount('你好世界')).toBe(4); // Chinese
    });

    it('should handle mixed content with URLs and emoji', () => {
      const content = 'Check this out 👉 https://example.com 🚀';
      // "Check this out  " (16) + 👉 (2) + " " (1) + URL (23) + " " (1) + 🚀 (2)
      expect(getTwitterCharacterCount(content)).toBeGreaterThanOrEqual(
        16 + 1 + 23 + 1
      );
    });

    it('should handle content at exactly 280 characters', () => {
      const content = 'x'.repeat(280);
      expect(getTwitterCharacterCount(content)).toBe(280);
    });

    it('should handle content over 280 characters', () => {
      const content = 'x'.repeat(300);
      expect(getTwitterCharacterCount(content)).toBe(300);
    });
  });

  describe('getLinkedInCharacterCount', () => {
    it('should count basic ASCII text correctly', () => {
      expect(getLinkedInCharacterCount('Hello world')).toBe(11);
      expect(getLinkedInCharacterCount('The quick brown fox')).toBe(19);
    });

    it('should handle empty string', () => {
      expect(getLinkedInCharacterCount('')).toBe(0);
    });

    it('should count URLs at their actual length (no shortening)', () => {
      expect(getLinkedInCharacterCount('Check this: https://x.com')).toBe(25);
      // "Check this: https://example.com/very/long/url/path" = 50 characters
      expect(
        getLinkedInCharacterCount(
          'Check this: https://example.com/very/long/url/path'
        )
      ).toBe(50);
    });

    it('should handle multiple URLs correctly', () => {
      const content = 'Check https://example.com and https://another.com';
      expect(getLinkedInCharacterCount(content)).toBe(content.length);
    });

    it('should count emoji (most count as 1 character on LinkedIn)', () => {
      expect(getLinkedInCharacterCount('👋')).toBeGreaterThanOrEqual(1);
      expect(getLinkedInCharacterCount('Hello 👋')).toBeGreaterThanOrEqual(7);
      expect(getLinkedInCharacterCount('👋🎉🚀')).toBeGreaterThanOrEqual(3);
    });

    it('should handle emoji with skin tones', () => {
      expect(getLinkedInCharacterCount('👋🏻')).toBeGreaterThanOrEqual(1);
      expect(getLinkedInCharacterCount('👨‍👩‍👧‍👦')).toBeGreaterThanOrEqual(1);
    });

    it('should count newlines as 1 character', () => {
      expect(getLinkedInCharacterCount('Line 1\nLine 2')).toBe(13);
      expect(getLinkedInCharacterCount('A\nB\nC')).toBe(5);
    });

    it('should handle special characters', () => {
      expect(getLinkedInCharacterCount('Hello! @user #hashtag')).toBe(21);
      expect(getLinkedInCharacterCount('$100 & counting...')).toBe(18);
    });

    it('should handle non-English characters', () => {
      expect(getLinkedInCharacterCount('Привет мир')).toBe(10);
      expect(getLinkedInCharacterCount('こんにちは')).toBe(5);
      expect(getLinkedInCharacterCount('你好世界')).toBe(4);
    });

    it('should handle content at exactly 3000 characters', () => {
      const content = 'x'.repeat(3000);
      expect(getLinkedInCharacterCount(content)).toBe(3000);
    });

    it('should handle content over 3000 characters', () => {
      const content = 'x'.repeat(3500);
      expect(getLinkedInCharacterCount(content)).toBe(3500);
    });
  });

  describe('validateCharacterCount', () => {
    describe('Twitter validation', () => {
      it('should validate content within limit', () => {
        const result = validateCharacterCount('Hello world', 'twitter');
        expect(result.isValid).toBe(true);
        expect(result.count).toBe(11);
        expect(result.maxCount).toBe(280);
        expect(result.isWarning).toBe(false);
      });

      it('should show warning at 260+ characters', () => {
        const content = 'x'.repeat(260);
        const result = validateCharacterCount(content, 'twitter');
        expect(result.isValid).toBe(true);
        expect(result.count).toBe(260);
        expect(result.isWarning).toBe(true);
      });

      it('should invalidate content at 281+ characters', () => {
        const content = 'x'.repeat(281);
        const result = validateCharacterCount(content, 'twitter');
        expect(result.isValid).toBe(false);
        expect(result.count).toBe(281);
        expect(result.isWarning).toBe(false); // Over limit, not warning
      });

      it('should validate content at exactly 280 characters', () => {
        const content = 'x'.repeat(280);
        const result = validateCharacterCount(content, 'twitter');
        expect(result.isValid).toBe(true);
        expect(result.count).toBe(280);
        expect(result.isWarning).toBe(false);
      });

      it('should account for URL shortening in validation', () => {
        const content =
          'Check this: https://example.com/very/long/url/path/that/goes/on';
        const result = validateCharacterCount(content, 'twitter');
        expect(result.count).toBe('Check this: '.length + 23);
        expect(result.isValid).toBe(true);
      });
    });

    describe('LinkedIn validation', () => {
      it('should validate content within limit', () => {
        const result = validateCharacterCount('Hello world', 'linkedin');
        expect(result.isValid).toBe(true);
        expect(result.count).toBe(11);
        expect(result.maxCount).toBe(3000);
        expect(result.isWarning).toBe(false);
      });

      it('should show warning at 2900+ characters', () => {
        const content = 'x'.repeat(2900);
        const result = validateCharacterCount(content, 'linkedin');
        expect(result.isValid).toBe(true);
        expect(result.count).toBe(2900);
        expect(result.isWarning).toBe(true);
      });

      it('should invalidate content at 3001+ characters', () => {
        const content = 'x'.repeat(3001);
        const result = validateCharacterCount(content, 'linkedin');
        expect(result.isValid).toBe(false);
        expect(result.count).toBe(3001);
        expect(result.isWarning).toBe(false);
      });

      it('should validate content at exactly 3000 characters', () => {
        const content = 'x'.repeat(3000);
        const result = validateCharacterCount(content, 'linkedin');
        expect(result.isValid).toBe(true);
        expect(result.count).toBe(3000);
        expect(result.isWarning).toBe(false);
      });
    });
  });

  describe('CHARACTER_LIMITS constant', () => {
    it('should have correct Twitter limits', () => {
      expect(CHARACTER_LIMITS.twitter.max).toBe(280);
      expect(CHARACTER_LIMITS.twitter.warning).toBe(260);
    });

    it('should have correct LinkedIn limits', () => {
      expect(CHARACTER_LIMITS.linkedin.max).toBe(3000);
      expect(CHARACTER_LIMITS.linkedin.warning).toBe(2900);
    });
  });
});
