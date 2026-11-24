import { describe, it, expect } from 'vitest';
import { maskEmail, maskPhone } from '../src/services/user.service.js';
import { createTeamSchema } from '../src/validators/team.validator.js';
import { isValidTransition, type CompetitionStatus } from '../src/models/Competition.js';

describe('Phase 2: Teams, Social & Security Logic Tests', () => {
  describe('Email & Phone Privacy Masking (Minors & Player Search)', () => {
    it('should mask standard email addresses properly', () => {
      expect(maskEmail('rahul.sharma@gmail.com')).toBe('r***a@gmail.com');
      expect(maskEmail('ab@example.com')).toBe('a***@example.com');
      expect(maskEmail('admin@gyan26.com')).toBe('a***n@gyan26.com');
    });

    it('should mask Indian phone numbers preserving head and tail', () => {
      expect(maskPhone('9876543210')).toBe('98****3210');
      expect(maskPhone('9911223344')).toBe('99****3344');
      expect(maskPhone(undefined)).toBeUndefined();
    });
  });

  describe('Team Creation Schema & Size Constraints', () => {
    it('should allow valid team sizes 2, 4, and 6', () => {
      expect(
        createTeamSchema.safeParse({
          name: 'Quantum Minds',
          category: 'Class 10',
          size: 2,
        }).success
      ).toBe(true);

      expect(
        createTeamSchema.safeParse({
          name: 'Quantum Minds',
          category: 'Class 10',
          size: 4,
        }).success
      ).toBe(true);

      expect(
        createTeamSchema.safeParse({
          name: 'Quantum Minds',
          category: 'Class 10',
          size: 6,
        }).success
      ).toBe(true);
    });

    it('should reject invalid team sizes like 1, 3, or 5', () => {
      expect(
        createTeamSchema.safeParse({
          name: 'Quantum Minds',
          category: 'Class 10',
          size: 1,
        }).success
      ).toBe(false);

      expect(
        createTeamSchema.safeParse({
          name: 'Quantum Minds',
          category: 'Class 10',
          size: 3,
        }).success
      ).toBe(false);

      expect(
        createTeamSchema.safeParse({
          name: 'Quantum Minds',
          category: 'Class 10',
          size: 5,
        }).success
      ).toBe(false);
    });
  });

  describe('Competition Status State Machine Transitions', () => {
    it('should only allow valid status machine transitions', () => {
      // Draft -> Registration Open
      expect(isValidTransition('Draft', 'Registration Open')).toBe(true);
      // Draft -> Live (invalid, must open registration first)
      expect(isValidTransition('Draft', 'Live')).toBe(false);

      // Registration Open -> Registration Closed
      expect(isValidTransition('Registration Open', 'Registration Closed')).toBe(true);
      // Registration Open -> Completed (invalid)
      expect(isValidTransition('Registration Open', 'Completed')).toBe(false);

      // Registration Closed -> Live
      expect(isValidTransition('Registration Closed', 'Live')).toBe(true);

      // Live -> Completed
      expect(isValidTransition('Live', 'Completed')).toBe(true);

      // Completed -> Archived
      expect(isValidTransition('Completed', 'Archived')).toBe(true);

      // Archived has no further transitions
      expect(isValidTransition('Archived', 'Live')).toBe(false);
    });
  });
});
