import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/utils/jwt.js';
import { registerSchema, loginSchema } from '../src/validators/auth.validator.js';
import { AppError } from '../src/utils/AppError.js';

describe('Auth Utilities & Security Tests', () => {
  describe('Password Hashing (Argon2)', () => {
    it('should hash a password and verify correctly', async () => {
      const password = 'SuperSecretPassword@123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$argon2')).toBe(true);

      const isValid = await verifyPassword(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword(hash, 'WrongPassword@123');
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    it('should generate and verify access tokens', () => {
      const payload = { userId: '507f1f77bcf86cd799439011', role: 'player' as const };
      const token = generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it('should generate and verify refresh tokens', () => {
      const payload = { userId: '507f1f77bcf86cd799439011', role: 'admin' as const };
      const token = generateRefreshToken(payload);

      expect(token).toBeDefined();
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it('should fail verification on tampered token', () => {
      const payload = { userId: '507f1f77bcf86cd799439011', role: 'player' as const };
      const token = generateAccessToken(payload);
      const tamperedToken = token + 'tampered';

      expect(() => verifyAccessToken(tamperedToken)).toThrow();
    });
  });

  describe('Auth Validation Schemas (Zod)', () => {
    it('should validate valid adult registration', () => {
      const validAdultData = {
        name: 'Amit Patel',
        email: 'amit.patel@example.com',
        phone: '9876543210',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        dateOfBirth: '1995-05-15',
        educationLevel: 'Undergraduate',
        institution: 'Mumbai University',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      };

      const result = registerSchema.safeParse(validAdultData);
      expect(result.success).toBe(true);
    });

    it('should enforce parental consent for minor (<18) registration', () => {
      const minorDataWithoutConsent = {
        name: 'Rohan Sharma',
        email: 'rohan.minor@example.com',
        phone: '9876543211',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        dateOfBirth: '2015-01-01', // Age ~11
        educationLevel: 'Class 5',
        institution: 'Kendriya Vidyalaya',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
      };

      const result = registerSchema.safeParse(minorDataWithoutConsent);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map((i) => i.path.join('.'));
        expect(issues).toContain('guardianName');
        expect(issues).toContain('guardianConsent');
      }
    });

    it('should validate minor registration when guardian consent is provided', () => {
      const minorDataWithConsent = {
        name: 'Rohan Sharma',
        email: 'rohan.minor@example.com',
        phone: '9876543211',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        dateOfBirth: '2015-01-01',
        educationLevel: 'Class 5',
        institution: 'Kendriya Vidyalaya',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        guardianName: 'Rajesh Sharma',
        guardianPhone: '9811122233',
        guardianEmail: 'parent@example.com',
        guardianConsent: true,
      };

      const result = registerSchema.safeParse(minorDataWithConsent);
      expect(result.success).toBe(true);
    });

    it('should validate login credentials schema', () => {
      const validEmailLogin = {
        identifier: 'user@example.com',
        password: 'anyPassword123',
      };
      expect(loginSchema.safeParse(validEmailLogin).success).toBe(true);

      const validPhoneLogin = {
        identifier: '9876543210',
        password: 'anyPassword123',
      };
      expect(loginSchema.safeParse(validPhoneLogin).success).toBe(true);
    });
  });

  describe('Centralized AppError', () => {
    it('should correctly format AppError operational instances', () => {
      const err = AppError.unauthorized('Invalid email or password');
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Invalid email or password');
      expect(err.isOperational).toBe(true);
    });
  });
});
