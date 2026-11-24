import { describe, it, expect } from 'vitest';

describe('Leaderboard Ranking & Tie-Break Evaluation', () => {
  interface MockResult {
    teamId: string;
    totalScore: number;
    accuracy: number;
    totalDurationSeconds: number;
    submittedAt: Date;
    rank?: number;
  }

  const sortResults = (
    results: MockResult[],
    tieBreakRule: 'fastestTime' | 'accuracy' | 'submissionOrder'
  ): MockResult[] => {
    return [...results].sort((a, b) => {
      // 1. Primary: Score DESC
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      // 2. Secondary: Configured tie-breaker
      if (tieBreakRule === 'fastestTime') {
        if (a.totalDurationSeconds !== b.totalDurationSeconds) {
          return a.totalDurationSeconds - b.totalDurationSeconds;
        }
      } else if (tieBreakRule === 'accuracy') {
        if (b.accuracy !== a.accuracy) {
          return b.accuracy - a.accuracy;
        }
      } else if (tieBreakRule === 'submissionOrder') {
        if (a.submittedAt.getTime() !== b.submittedAt.getTime()) {
          return a.submittedAt.getTime() - b.submittedAt.getTime();
        }
      }

      // 3. Fallback: earliest submission
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });
  };

  it('should rank primarily by total score descending', () => {
    const data: MockResult[] = [
      { teamId: 'A', totalScore: 350, accuracy: 0.8, totalDurationSeconds: 120, submittedAt: new Date(1000) },
      { teamId: 'B', totalScore: 420, accuracy: 0.9, totalDurationSeconds: 130, submittedAt: new Date(2000) },
      { teamId: 'C', totalScore: 290, accuracy: 0.7, totalDurationSeconds: 100, submittedAt: new Date(3000) },
    ];

    const sorted = sortResults(data, 'fastestTime');
    expect(sorted[0].teamId).toBe('B'); // 420
    expect(sorted[1].teamId).toBe('A'); // 350
    expect(sorted[2].teamId).toBe('C'); // 290
  });

  it('should break ties using fastestTime (lower duration wins)', () => {
    const data: MockResult[] = [
      { teamId: 'Slow', totalScore: 400, accuracy: 0.9, totalDurationSeconds: 150, submittedAt: new Date(1000) },
      { teamId: 'Fast', totalScore: 400, accuracy: 0.9, totalDurationSeconds: 95, submittedAt: new Date(2000) },
    ];

    const sorted = sortResults(data, 'fastestTime');
    expect(sorted[0].teamId).toBe('Fast');
    expect(sorted[1].teamId).toBe('Slow');
  });

  it('should break ties using accuracy (higher accuracy wins)', () => {
    const data: MockResult[] = [
      { teamId: 'LowAcc', totalScore: 300, accuracy: 0.75, totalDurationSeconds: 100, submittedAt: new Date(1000) },
      { teamId: 'HighAcc', totalScore: 300, accuracy: 0.92, totalDurationSeconds: 120, submittedAt: new Date(2000) },
    ];

    const sorted = sortResults(data, 'accuracy');
    expect(sorted[0].teamId).toBe('HighAcc');
    expect(sorted[1].teamId).toBe('LowAcc');
  });

  it('should break ties using submissionOrder (earlier submission wins)', () => {
    const t1 = new Date('2026-11-24T10:00:00Z');
    const t2 = new Date('2026-11-24T10:05:00Z');

    const data: MockResult[] = [
      { teamId: 'Second', totalScore: 500, accuracy: 1.0, totalDurationSeconds: 80, submittedAt: t2 },
      { teamId: 'First', totalScore: 500, accuracy: 1.0, totalDurationSeconds: 80, submittedAt: t1 },
    ];

    const sorted = sortResults(data, 'submissionOrder');
    expect(sorted[0].teamId).toBe('First');
    expect(sorted[1].teamId).toBe('Second');
  });

  it('should format CSV output safely escaping commas and quotes', () => {
    const rawTeamName = 'Team "Alpha, Bravo"';
    const escaped = `"${rawTeamName.replace(/"/g, '""')}"`;
    expect(escaped).toBe('"Team ""Alpha, Bravo"""');
  });
});
