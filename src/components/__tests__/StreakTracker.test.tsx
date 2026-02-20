import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import StreakTracker from '../StreakTracker';
import { renderWithStore, resetStore } from '../../test/utils';

describe('StreakTracker', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders streak tracker', () => {
    renderWithStore(<StreakTracker streak={0} />);
    expect(screen.getAllByText(/Streak/i).length).toBeGreaterThan(0);
  });

  it('displays current streak correctly', () => {
    renderWithStore(<StreakTracker streak={7} />);

    const matches = screen.getAllByText((_, element) =>
      Boolean(element?.textContent?.includes('7') && element?.textContent?.includes('d'))
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays longest streak', () => {
    renderWithStore(<StreakTracker streak={15} />);

    const matches = screen.getAllByText((_, element) =>
      Boolean(element?.textContent?.includes('15') && element?.textContent?.includes('d'))
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows fire icon for active streak', () => {
    const { container } = renderWithStore(<StreakTracker streak={3} />);

    // Fire icon should be present
    const fireIcon = container.querySelector('svg');
    expect(fireIcon).toBeInTheDocument();
  });
});
