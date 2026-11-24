import { describe, it, expect } from 'vitest';
import { calculateMultipleCorrectScore } from '../src/services/question.service.js';
import { createQuestionSchema } from '../src/validators/question.validator.js';

describe('Phase 3: Question Bank & Scoring Formula Tests', () => {
  describe('Multiple-Correct Scoring Evaluation', () => {
    const correctOptions = ['A', 'C'];
    const basePoints = 100;

    it('should award full points when all correct options are chosen (All-or-nothing)', () => {
      const score = calculateMultipleCorrectScore(
        ['A', 'C'],
        correctOptions,
        basePoints,
        false
      );
      expect(score).toBe(100);
    });

    it('should award 0 points when only partial correct options are chosen (All-or-nothing)', () => {
      const score = calculateMultipleCorrectScore(
        ['A'],
        correctOptions,
        basePoints,
        false
      );
      expect(score).toBe(0);
    });

    it('should award 0 points when a wrong option is included (All-or-nothing)', () => {
      const score = calculateMultipleCorrectScore(
        ['A', 'B', 'C'],
        correctOptions,
        basePoints,
        false
      );
      expect(score).toBe(0);
    });

    it('should compute partial credit proportionally', () => {
      // 1 out of 2 correct = 50% of 100 = 50 points
      const score = calculateMultipleCorrectScore(
        ['A'],
        correctOptions,
        basePoints,
        true, // partialCredit enabled
        0
      );
      expect(score).toBe(50);
    });

    it('should apply penalty for wrong selections under partial credit without going below 0', () => {
      // 1 correct (50) - 1 wrong with 25 penalty = 25 points
      const score = calculateMultipleCorrectScore(
        ['A', 'D'],
        correctOptions,
        basePoints,
        true,
        25
      );
      expect(score).toBe(25);

      // Only wrong options = 0 (clamped)
      const zeroScore = calculateMultipleCorrectScore(
        ['B', 'D'],
        correctOptions,
        basePoints,
        true,
        50
      );
      expect(zeroScore).toBe(0);
    });
  });

  describe('Question Zod Validation Schemas', () => {
    it('should validate a complete single-choice question', () => {
      const valid = {
        text: 'What is the capital of India?',
        type: 'single_choice',
        options: [
          { id: 'A', text: 'Mumbai' },
          { id: 'B', text: 'New Delhi' },
          { id: 'C', text: 'Kolkata' },
          { id: 'D', text: 'Chennai' },
        ],
        correctAnswers: ['B'],
        subjectId: '507f1f77bcf86cd799439011',
        difficulty: 'easy',
        educationLevel: 'Class 5',
        points: 100,
        timeLimit: 30,
      };

      expect(createQuestionSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject a question with fewer than 2 options', () => {
      const invalid = {
        text: 'What is 2 + 2?',
        type: 'single_choice',
        options: [{ id: 'A', text: '4' }],
        correctAnswers: ['A'],
        subjectId: '507f1f77bcf86cd799439011',
        difficulty: 'easy',
        educationLevel: 'Class 1',
      };

      expect(createQuestionSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
