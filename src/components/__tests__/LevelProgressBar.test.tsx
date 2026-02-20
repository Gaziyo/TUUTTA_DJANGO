import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import LevelProgressBar from '../LevelProgressBar';
import { renderWithStore, resetStore } from '../../test/utils';

describe('LevelProgressBar', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders level progress bar', () => {
    renderWithStore(
      <LevelProgressBar
        level={1}
        currentXP={25}
        nextLevelXP={100}
        levelTitle="Novice"
      />
    );
    expect(screen.getAllByText(/Level/i).length).toBeGreaterThan(0);
  });

  it('displays current level', () => {
    renderWithStore(
      <LevelProgressBar
        level={5}
        currentXP={500}
        nextLevelXP={800}
        levelTitle="Scholar"
      />
    );

    expect(screen.getByText(/Level 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Scholar/i)).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', () => {
    const { container } = renderWithStore(
      <LevelProgressBar
        level={3}
        currentXP={50}
        nextLevelXP={100}
        levelTitle="Learner"
      />
    );

    // Progress bar should be at 50%
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders in dark mode', () => {
    const { container } = renderWithStore(
      <LevelProgressBar
        level={2}
        currentXP={25}
        nextLevelXP={100}
        levelTitle="Rookie"
      />,
      {
        initialStore: {
          userData: {
            'test-user-123': {
              notes: [],
              chatSessions: [],
              subjects: [],
              folders: [],
              settings: {
                theme: 'dark',
                fontSize: 'medium',
                speechEnabled: false,
                autoSave: true,
                notificationEnabled: true,
              },
              achievements: [],
              streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: 0, history: [] },
              files: [],
              assessments: [],
              xp: 0,
              level: { level: 1, title: 'Novice', minXP: 0, maxXP: 100 },
            },
          },
        },
      }
    );

    // Check for dark mode classes
    const darkElements = container.querySelectorAll('.bg-gray-700, .text-gray-300');
    expect(darkElements.length).toBeGreaterThan(0);
  });
});
