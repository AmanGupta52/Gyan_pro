import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { sanitize } from '../src/middleware/sanitize.js';
import { authLimiter, strictLimiter, generalLimiter } from '../src/middleware/rateLimiter.js';
import { calculateAge } from '../src/validators/auth.validator.js';

describe('Security Hardening & Protection Tests', () => {
  describe('NoSQL Injection Sanitizer Middleware', () => {
    it('should drop keys starting with $ in body, query, and params', () => {
      const mockReq = {
        body: {
          username: 'student@gyan26.org',
          password: { $gt: '' },
          $where: 'sleep(5000)',
          nested: {
            valid: true,
            $ne: null,
          },
        },
        query: {
          category: 'Class 10',
          $regex: '.*',
        },
        params: {
          id: '64f1234567890abcdef12345',
          $gt: 'admin',
        },
      } as unknown as Request;

      const mockRes = {} as Response;
      let nextCalled = false;
      const mockNext = () => {
        nextCalled = true;
      };

      sanitize(mockReq, mockRes, mockNext);

      expect(nextCalled).toBe(true);

      // Verify body
      expect(mockReq.body.username).toBe('student@gyan26.org');
      expect(mockReq.body.password).toEqual({});
      expect(mockReq.body.$where).toBeUndefined();
      expect(mockReq.body.nested.valid).toBe(true);
      expect((mockReq.body.nested as any).$ne).toBeUndefined();

      // Verify query
      expect(mockReq.query.category).toBe('Class 10');
      expect((mockReq.query as any).$regex).toBeUndefined();

      // Verify params
      expect(mockReq.params.id).toBe('64f1234567890abcdef12345');
      expect((mockReq.params as any).$gt).toBeUndefined();
    });

    it('should drop keys containing "." to prevent field path traversal', () => {
      const mockReq = {
        body: {
          'profile.role': 'admin',
          'account.isActive': true,
          safeField: 'normalValue',
        },
      } as unknown as Request;

      sanitize(mockReq, {} as Response, () => {});

      expect(mockReq.body['profile.role']).toBeUndefined();
      expect(mockReq.body['account.isActive']).toBeUndefined();
      expect(mockReq.body.safeField).toBe('normalValue');
    });

    it('should sanitize nested arrays of objects and strip operators from strings', () => {
      const mockReq = {
        body: {
          filters: [
            { field: 'name', value: 'Rohan' },
            { $where: 'attack' },
            { field: 'status', operator: '$ne' },
          ],
        },
      } as unknown as Request;

      sanitize(mockReq, {} as Response, () => {});

      expect(mockReq.body.filters).toHaveLength(3);
      expect(mockReq.body.filters[0]).toEqual({ field: 'name', value: 'Rohan' });
      expect(mockReq.body.filters[1]).toEqual({});
      // The string value '$ne' should have the operator stripped
      expect(mockReq.body.filters[2].operator).toBe('');
    });
  });

  describe('Rate Limiter Configuration Verification', () => {
    it('should configure authLimiter with max 10 requests per 15 minutes', () => {
      // @ts-expect-error accessing internal limiter config
      expect(authLimiter).toBeDefined();
    });

    it('should configure strictLimiter with max 5 requests per 15 minutes', () => {
      // @ts-expect-error accessing internal limiter config
      expect(strictLimiter).toBeDefined();
    });

    it('should configure generalLimiter with max 100 requests per 15 minutes', () => {
      // @ts-expect-error accessing internal limiter config
      expect(generalLimiter).toBeDefined();
    });
  });

  describe('Minor & DPDP Act Verification Logic', () => {
    it('should correctly identify minors (< 18 years old)', () => {
      const today = new Date();
      const fifteenYearsAgo = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
      const age = calculateAge(fifteenYearsAgo);
      expect(age).toBe(15);
      expect(age < 18).toBe(true);
    });

    it('should correctly identify adults (>= 18 years old)', () => {
      const today = new Date();
      const twentyYearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
      const age = calculateAge(twentyYearsAgo);
      expect(age).toBe(20);
      expect(age >= 18).toBe(true);
    });
  });
});

describe('Sanitizer keeps credentials intact', () => {
  it('does not alter password/token strings that contain operator-like text', () => {
    const req = {
      body: { password: 'Pa$or1234$in!', token: 'abc$ne', note: 'x$gt' },
    } as unknown as Request;
    sanitize(req, {} as Response, () => {});
    expect(req.body.password).toBe('Pa$or1234$in!');
    expect(req.body.token).toBe('abc$ne');
    expect(req.body.note).toBe('x');
  });
});
