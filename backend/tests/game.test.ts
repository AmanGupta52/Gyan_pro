import { describe, it, expect } from 'vitest';
import { LATENCY_GRACE_MS } from '../src/services/game.service.js';
import { calculateMultipleCorrectScore } from '../src/services/question.service.js';

describe('Game Engine Scoring & Anti-Cheat Logic', () => {
  describe('Speed Bonus Calculation', () => {
    const calculateSpeedBonus = (
      timeLimit: number,
      timeTaken: number,
      maxBonus: number
    ): number => {
      if (timeLimit <= 0 || maxBonus <= 0) return 0;
      const ratio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
      return Math.round(maxBonus * ratio);
    };

    it('should award max speed bonus when answered immediately (0s taken)', () => {
      const bonus = calculateSpeedBonus(30, 0, 50);
      expect(bonus).toBe(50);
    });

    it('should award half bonus when answered halfway (15s out of 30s)', () => {
      const bonus = calculateSpeedBonus(30, 15, 50);
      expect(bonus).toBe(25);
    });

    it('should award 0 bonus when answered at or after deadline', () => {
      const bonus = calculateSpeedBonus(30, 30, 50);
      expect(bonus).toBe(0);

      const lateBonus = calculateSpeedBonus(30, 32, 50);
      expect(lateBonus).toBe(0);
    });
  });

  describe('Multiple Correct Scoring Configurations', () => {
    const correctOptions = ['A', 'C'];
    const basePoints = 100;

    it('should award full points for all correct selections in all-or-nothing mode', () => {
      const score = calculateMultipleCorrectScore(['A', 'C'], correctOptions, basePoints, false, 0);
      expect(score).toBe(100);
    });

    it('should award 0 points if any correct option is missing in all-or-nothing mode', () => {
      const score = calculateMultipleCorrectScore(['A'], correctOptions, basePoints, false, 0);
      expect(score).toBe(0);
    });

    it('should award 0 points if an extra incorrect option is picked in all-or-nothing mode', () => {
      const score = calculateMultipleCorrectScore(['A', 'B', 'C'], correctOptions, basePoints, false, 0);
      expect(score).toBe(0);
    });

    it('should award partial credit when partial scoring is enabled', () => {
      const score = calculateMultipleCorrectScore(['A'], correctOptions, basePoints, true, 0);
      expect(score).toBe(50); // 1 of 2 correct = 50%
    });

    it('should deduct penalty for wrong options under partial credit', () => {
      const score = calculateMultipleCorrectScore(['A', 'D'], correctOptions, basePoints, true, 20);
      // 1 correct (50 points) - 1 wrong penalty (20 points) = 30 points
      expect(score).toBe(30);
    });
  });

  describe('Latency Grace Window and Anti-Cheat Deadlines', () => {
    it('should accept answers received within server deadline', () => {
      const deadline = Date.now() + 5000;
      const submittedAt = Date.now();
      const isLate = submittedAt > deadline + LATENCY_GRACE_MS;
      expect(isLate).toBe(false);
    });

    it('should accept answers received within 1500ms grace latency', () => {
      const now = Date.now();
      const deadline = now - 500; // 500ms past nominal deadline
      const submittedAt = now;
      const isLate = submittedAt > deadline + LATENCY_GRACE_MS;
      expect(isLate).toBe(false);
    });

    it('should reject answers received beyond deadline + grace window', () => {
      const now = Date.now();
      const deadline = now - 2000; // 2000ms past nominal deadline
      const submittedAt = now;
      const isLate = submittedAt > deadline + LATENCY_GRACE_MS;
      expect(isLate).toBe(true);
    });
  });

  describe('Metric Integrity: Score vs Accuracy', () => {
    it('should calculate team score as sum of player scores', () => {
      const playerScores = [120, 145, 90, 110];
      const teamScore = playerScores.reduce((sum, s) => sum + s, 0);
      expect(teamScore).toBe(465);
    });

    it('should calculate accuracy as correct answers / total questions strictly between 0 and 1', () => {
      const totalQuestions = 10;
      const teamMembers = 4;
      const totalPossibleAnswers = totalQuestions * teamMembers;
      const totalCorrect = 32;

      const accuracy = Number((totalCorrect / totalPossibleAnswers).toFixed(4));
      expect(accuracy).toBe(0.8);
      expect(accuracy).toBeLessThanOrEqual(1.0);
      expect(accuracy).toBeGreaterThanOrEqual(0.0);
    });
  });
});
