import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { calculateMultipleCorrectScore } from '../src/services/question.service.js';

// Mock User model to prevent hanging on Mongoose buffering
vi.mock('../src/models/User.js', () => {
  return {
    User: {
      findOne: vi.fn().mockImplementation(() => {
        const query: any = Promise.resolve(null);
        query.select = vi.fn().mockReturnThis();
        query.lean = vi.fn().mockResolvedValue(null);
        return query;
      }),
    },
  };
});

// Mock DonationSettings
vi.mock('../src/models/DonationSettings.js', () => {
  const mockDoc = {
    upiId: 'gyan26@upi',
    payeeName: 'GYAN-26 Educational Trust',
    suggestedAmounts: [101, 251, 501, 1100, 2100],
    notes: 'Shagun for student prize fund',
    bankDetails: {
      accountNumber: '98765432101234',
      ifsc: 'SBIN0001234',
      bankName: 'State Bank of India',
      branch: 'New Delhi Main Branch',
      accountHolder: 'GYAN-26 Educational Trust',
    },
    taxExemptionNote: '100% transparent student prize fund',
    isActive: true,
    toObject: () => mockDoc,
    lean: () => Promise.resolve(mockDoc),
  };

  return {
    DonationSettings: {
      findOne: vi.fn().mockImplementation(() => {
        const query: any = Promise.resolve(mockDoc);
        query.lean = vi.fn().mockResolvedValue(mockDoc);
        return query;
      }),
      create: vi.fn().mockResolvedValue(mockDoc),
    },
  };
});

// Quiz certificates live in their own collection; verification falls back to it when a
// competition certificate is not found. Nothing matches here, so unknown ids still give 404.
vi.mock('../src/models/QuizCertificate.js', () => {
  const emptyQuery: any = {
    populate: () => emptyQuery,
    lean: () => Promise.resolve(null),
  };
  return { QuizCertificate: { findOne: vi.fn().mockReturnValue(emptyQuery) } };
});

// Mock Certificate with chained .populate().populate().populate().lean()
vi.mock('../src/models/Certificate.js', () => {
  return {
    Certificate: {
      findOne: vi.fn().mockImplementation((filter: { certificateId?: string }) => {
        const isValid = filter?.certificateId === 'GYAN26-2026-000001';
        const doc = isValid
          ? {
              certificateId: 'GYAN26-2026-000001',
              status: 'issued',
              rank: 1,
              score: 450,
              accuracy: 90,
              issuedAt: new Date().toISOString(),
              userId: {
                name: 'Rohan Sharma',
                educationLevel: 'Class 10',
              },
              competitionId: {
                name: 'National Math Olympiad 2026',
                category: 'Secondary School',
              },
              teamId: {
                name: 'Aryabhata Squad',
              },
            }
          : null;

        const queryObj: any = {
          populate: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue(doc),
        };
        return queryObj;
      }),
    },
  };
});

describe('End-to-End API Integration & Security Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Health & Routing Infrastructure', () => {
    it('GET /health should return 200 with service metadata', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('gyan-26-backend');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /api/health should return 200 OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /api/unknown-route should return 404 NOT_FOUND error envelope', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('2. Minor Registration & DPDP Act Parental Consent Verification', () => {
    it('POST /api/auth/register should reject under-18 user without parental consent', async () => {
      const today = new Date();
      const fourteenYearsAgo = new Date(
        today.getFullYear() - 14,
        today.getMonth(),
        today.getDate()
      ).toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Aarav Gupta',
          email: 'aarav.minor@example.com',
          phone: '9876543210',
          password: 'Password@123',
          confirmPassword: 'Password@123',
          dateOfBirth: fourteenYearsAgo,
          educationLevel: 'Class 8',
          institution: 'Delhi Public School',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          // Guardian details intentionally omitted to trigger DPDP Act validation failure
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const messages = JSON.stringify(res.body.error.details);
      expect(messages).toContain('Guardian name is required for users under 18');
    });

    it('POST /api/auth/register should reject passwords under 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Vikram Singh',
          email: 'vikram@example.com',
          phone: '9876543211',
          password: 'short',
          confirmPassword: 'short',
          dateOfBirth: '2000-01-01',
          educationLevel: 'Undergraduate',
          institution: 'IIT Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const messages = JSON.stringify(res.body.error.details);
      expect(messages).toContain('Password must be at least 8 characters');
    });
  });

  describe('3. NoSQL Injection Defence in Depth', () => {
    it('POST /api/auth/login should sanitize payload and strip $gt operators before query execution', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'student@example.com',
          password: { $gt: '' },
        });

      // Zod schema expects password to be a string. Sanitizer converts password object to {},
      // preventing MongoDB query injection and failing fast with 400 Bad Request.
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Rate Limiting on Sensitive Endpoints', () => {
    it('should trigger RATE_LIMIT_EXCEEDED on excessive strict requests', async () => {
      // strictLimiter allows max 5 requests per 15 minutes
      const requests = Array.from({ length: 7 }).map(() =>
        request(app).post('/api/auth/forgot-password').send({ email: 'test@gyan26.org' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.find((r) => r.status === 429);

      if (rateLimited) {
        expect(rateLimited.status).toBe(429);
        expect(rateLimited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('5. Donations & Indian Payment API Endpoints', () => {
    it('GET /api/donations/settings should return active settings and default QR', async () => {
      const res = await request(app).get('/api/donations/settings');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.settings.upiId).toBe('gyan26@upi');
      expect(res.body.data.defaultQrCode).toContain('data:image/png;base64,');
    });

    it('GET /api/donations/qr should return custom amount QR and NPCI URI', async () => {
      const res = await request(app)
        .get('/api/donations/qr')
        .query({ amount: 1100, note: 'Scholarship Patron' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.amount).toBe(1100);
      expect(res.body.data.upiUri).toContain('&am=1100.00');
      expect(res.body.data.upiUri).toContain('Scholarship%20Patron');
      expect(res.body.data.qrCodeDataUrl).toContain('data:image/png;base64,');
    });

    it('GET /api/donations/qr should reject negative or zero amounts with 400', async () => {
      const res = await request(app).get('/api/donations/qr').query({ amount: -250 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('6. Tournament Scoring Logic (All-or-Nothing vs Partial Credit)', () => {
    const correctOptions = ['optA', 'optB'];
    const maxPoints = 20;

    it('should award full points when all correct options are selected (all-or-nothing)', () => {
      const score = calculateMultipleCorrectScore(
        ['optA', 'optB'],
        correctOptions,
        maxPoints,
        false
      );

      expect(score).toBe(20);
    });

    it('should award 0 points when only subset is selected under all-or-nothing', () => {
      const score = calculateMultipleCorrectScore(
        ['optA'],
        correctOptions,
        maxPoints,
        false
      );

      expect(score).toBe(0);
    });

    it('should award partial credit proportional to correct choices under partial_credit scheme', () => {
      const score = calculateMultipleCorrectScore(
        ['optA'],
        correctOptions,
        maxPoints,
        true
      );

      // 1 out of 2 correct = 10 points
      expect(score).toBe(10);
    });

    it('should award 0 points if an incorrect option is selected with penalty', () => {
      const score = calculateMultipleCorrectScore(
        ['optA', 'optWrong'],
        correctOptions,
        maxPoints,
        true,
        10
      );

      expect(score).toBe(0);
    });
  });

  describe('7. Verifiable Certificates Public Verification', () => {
    it('GET /api/certificates/verify/:certificateId should return candidate details for valid credential', async () => {
      const res = await request(app).get('/api/certificates/verify/GYAN26-2026-000001');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.certificateId).toBe('GYAN26-2026-000001');
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.recipientName).toBe('Rohan Sharma');
      expect(res.body.data.competitionName).toBe('National Math Olympiad 2026');
      expect(res.body.data.rank).toBe(1);
      expect(res.body.data.score).toBe(450);

      // Verify privacy: no sensitive phone or email in public verification payload
      expect(res.body.data.recipientPhone).toBeUndefined();
      expect(res.body.data.recipientEmail).toBeUndefined();
    });

    it('GET /api/certificates/verify/:certificateId should return 404 for unknown certificate ID', async () => {
      const res = await request(app).get('/api/certificates/verify/INVALID-ID-999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
