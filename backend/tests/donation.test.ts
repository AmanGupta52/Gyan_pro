import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildUpiUri,
  generateUpiQrCode,
  generateCustomQr,
} from '../src/services/donation.service.js';
import { AppError } from '../src/utils/AppError.js';

// Mock DonationSettings model
const mockSettingsData = {
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
  taxExemptionNote: 'Donations are utilized 100% towards student scholarships.',
  isActive: true,
  toObject: () => mockSettingsData,
  lean: () => Promise.resolve(mockSettingsData),
};

vi.mock('../src/models/DonationSettings.js', () => {
  return {
    DonationSettings: {
      findOne: vi.fn().mockImplementation(() => {
        const query: any = Promise.resolve(mockSettingsData);
        query.lean = vi.fn().mockResolvedValue(mockSettingsData);
        return query;
      }),
      create: vi.fn().mockImplementation(() => {
        const doc: any = Promise.resolve(mockSettingsData);
        doc.toObject = () => mockSettingsData;
        return doc;
      }),
    },
  };
});

describe('Donations & Indian UPI Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NPCI UPI URI Generation', () => {
    it('should generate standard NPCI URI with payee address and name', () => {
      const uri = buildUpiUri({
        upiId: 'gyan26@upi',
        payeeName: 'GYAN-26 Educational Trust',
      });

      expect(uri).toContain('upi://pay?');
      expect(uri).toContain('pa=gyan26%40upi');
      expect(uri).toContain('pn=GYAN-26%20Educational%20Trust');
      expect(uri).toContain('cu=INR');
      expect(uri).not.toContain('&am=');
    });

    it('should format amounts to 2 decimal places in UPI URI', () => {
      const uri = buildUpiUri({
        upiId: 'gyan26@upi',
        payeeName: 'GYAN-26 Educational Trust',
        amount: 501,
        notes: 'Shagun for student prize fund',
      });

      expect(uri).toContain('&am=501.00');
      expect(uri).toContain('&tn=Shagun%20for%20student%20prize%20fund');
    });

    it('should handle decimal amounts correctly (e.g. 100.50)', () => {
      const uri = buildUpiUri({
        upiId: 'gyan26@upi',
        payeeName: 'GYAN-26 Trust',
        amount: 100.5,
      });

      expect(uri).toContain('&am=100.50');
    });
  });

  describe('QR Code Generation', () => {
    it('should generate a valid PNG base64 Data URL for a UPI URI', async () => {
      const upiUri = 'upi://pay?pa=gyan26@upi&pn=GYAN-26&am=501.00&cu=INR';
      const qrDataUrl = await generateUpiQrCode(upiUri);

      expect(qrDataUrl).toBeDefined();
      expect(typeof qrDataUrl).toBe('string');
      expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });
  });

  describe('Custom Amount QR & Validation', () => {
    it('should generate custom QR payload for valid Shagun amount', async () => {
      const result = await generateCustomQr(1100, 'Honorarium for scholars');

      expect(result).toBeDefined();
      expect(result.amount).toBe(1100);
      expect(result.upiId).toBe('gyan26@upi');
      expect(result.upiUri).toContain('&am=1100.00');
      expect(result.upiUri).toContain('Honorarium%20for%20scholars');
      expect(result.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should reject non-positive amounts with AppError 400', async () => {
      await expect(generateCustomQr(0)).rejects.toThrow(AppError);
      await expect(generateCustomQr(-50)).rejects.toThrow(AppError);
      // @ts-expect-error test invalid string
      await expect(generateCustomQr('abc')).rejects.toThrow(AppError);
    });

    it('should reject amounts exceeding single transaction limit (₹10,00,000)', async () => {
      await expect(generateCustomQr(2000000)).rejects.toThrow(AppError);
    });
  });
});
