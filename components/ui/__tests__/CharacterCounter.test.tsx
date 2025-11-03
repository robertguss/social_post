import { render, screen } from '@testing-library/react';
import { CharacterCounter } from '../CharacterCounter';

describe('CharacterCounter', () => {
  describe('Display Format', () => {
    it('should display count in "X / Y" format', () => {
      render(
        <CharacterCounter
          currentCount={150}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      expect(screen.getByText('150 / 280')).toBeInTheDocument();
    });

    it('should display count for LinkedIn', () => {
      render(
        <CharacterCounter
          currentCount={1500}
          maxCount={3000}
          warningThreshold={2900}
          platform="linkedin"
        />
      );

      expect(screen.getByText('1500 / 3000')).toBeInTheDocument();
    });

    it('should display zero count', () => {
      render(
        <CharacterCounter
          currentCount={0}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      expect(screen.getByText('0 / 280')).toBeInTheDocument();
    });
  });

  describe('Styling States', () => {
    it('should apply default neutral styling when count is normal', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={100}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('text-gray-600');
    });

    it('should apply warning styling at warning threshold', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={260}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('text-orange-500');
    });

    it('should apply warning styling between warning and max threshold', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={270}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('text-orange-500');
    });

    it('should apply error styling at max threshold', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={280}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('text-red-600');
    });

    it('should apply error styling when over max threshold', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={300}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('text-red-600');
    });

    it('should apply warning styling for LinkedIn at 2900 characters', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={2900}
          maxCount={3000}
          warningThreshold={2900}
          platform="linkedin"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('text-orange-500');
    });

    it('should apply error styling for LinkedIn at 3000+ characters', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={3001}
          maxCount={3000}
          warningThreshold={2900}
          platform="linkedin"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('text-red-600');
    });
  });

  describe('Visual Indicators', () => {
    it('should not show icons when count is normal', () => {
      render(
        <CharacterCounter
          currentCount={100}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      // No warning or error icons should be present
      expect(screen.queryByRole('img', { name: /warning/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /error/i })).not.toBeInTheDocument();
    });

    it('should show warning icon when in warning state', () => {
      render(
        <CharacterCounter
          currentCount={265}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      expect(
        screen.getByRole('img', { name: /warning: approaching character limit/i })
      ).toBeInTheDocument();
    });

    it('should show error icon when at or over max', () => {
      render(
        <CharacterCounter
          currentCount={285}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      expect(
        screen.getByRole('img', { name: /error: character limit exceeded/i })
      ).toBeInTheDocument();
    });

    it('should not show warning icon when in error state', () => {
      render(
        <CharacterCounter
          currentCount={285}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      // Only error icon should be present, not warning
      expect(
        screen.queryByRole('img', { name: /warning: approaching character limit/i })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('img', { name: /error: character limit exceeded/i })
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={100}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveAttribute('role', 'status');
    });

    it('should have aria-live="polite" when count is normal', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={100}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-live="assertive" when in warning state', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={265}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-live="assertive" when in error state', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={285}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveAttribute('aria-live', 'assertive');
    });

    it('should provide screen reader text for normal state', () => {
      render(
        <CharacterCounter
          currentCount={100}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      expect(
        screen.getByText('100 of 280 characters used.', { selector: '.sr-only' })
      ).toBeInTheDocument();
    });

    it('should provide screen reader text for warning state', () => {
      render(
        <CharacterCounter
          currentCount={265}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      expect(
        screen.getByText('Approaching character limit. 265 of 280 characters used.', {
          selector: '.sr-only',
        })
      ).toBeInTheDocument();
    });

    it('should provide screen reader text for error state', () => {
      render(
        <CharacterCounter
          currentCount={285}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
        />
      );

      expect(
        screen.getByText('Character limit exceeded. 285 of 280 characters used.', {
          selector: '.sr-only',
        })
      ).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(
        <CharacterCounter
          currentCount={100}
          maxCount={280}
          warningThreshold={260}
          platform="twitter"
          className="custom-class"
        />
      );

      const counterDiv = container.firstChild as HTMLElement;
      expect(counterDiv).toHaveClass('custom-class');
    });
  });
});
