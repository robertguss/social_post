import * as React from 'react';
import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  currentCount: number;
  maxCount: number;
  warningThreshold: number;
  platform: 'twitter' | 'linkedin';
  className?: string;
}

/**
 * CharacterCounter displays a real-time character count for platform-specific content.
 * Shows visual indicators (color changes) for warning and error states.
 *
 * @param currentCount - Current character count
 * @param maxCount - Maximum allowed characters
 * @param warningThreshold - Character count threshold to show warning styling
 * @param platform - Platform identifier ('twitter' | 'linkedin')
 * @param className - Optional additional CSS classes
 */
export function CharacterCounter({
  currentCount,
  maxCount,
  warningThreshold,
  platform, // eslint-disable-line @typescript-eslint/no-unused-vars
  className,
}: CharacterCounterProps) {
  // platform param is kept in props for semantic clarity and future enhancements
  // but not currently used in the implementation
  const isWarning = currentCount >= warningThreshold && currentCount < maxCount;
  const isError = currentCount > maxCount;

  // Determine color classes based on state
  const colorClass = isError
    ? 'text-red-600 dark:text-red-400'
    : isWarning
      ? 'text-orange-500 dark:text-orange-400'
      : 'text-gray-600 dark:text-gray-400';

  // Determine status for screen readers
  const ariaLiveValue = isError || isWarning ? 'assertive' : 'polite';

  // Screen reader announcement
  const srText = isError
    ? `Character limit exceeded. ${currentCount} of ${maxCount} characters used.`
    : isWarning
      ? `Approaching character limit. ${currentCount} of ${maxCount} characters used.`
      : `${currentCount} of ${maxCount} characters used.`;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium transition-colors',
        colorClass,
        className
      )}
      aria-live={ariaLiveValue}
      role="status"
    >
      <span className="tabular-nums">
        {currentCount} / {maxCount}
      </span>
      {isError && (
        <span role="img" aria-label="Error: Character limit exceeded">
          ⚠️
        </span>
      )}
      {isWarning && !isError && (
        <span role="img" aria-label="Warning: Approaching character limit">
          ⚡
        </span>
      )}
      {/* Hidden text for screen readers */}
      <span className="sr-only">{srText}</span>
    </div>
  );
}
