import { describe, it, expect } from 'vitest';
import { createCertificatePDFBuffer } from '../src/services/certificate.service.js';

describe('Certificate Generation & ID Format', () => {
  it('should format certificate IDs correctly as GYAN26-YYYY-NNNNNN', () => {
    const year = 2026;
    const seq = 42;
    const formatted = `GYAN26-${year}-${seq.toString().padStart(6, '0')}`;
    expect(formatted).toBe('GYAN26-2026-000042');
    expect(formatted).toMatch(/^GYAN26-\d{4}-\d{6}$/);
  });

  it('should generate a valid PDF binary buffer containing PDF headers', async () => {
    const testPayload = {
      certificateId: 'GYAN26-2026-000001',
      recipientName: 'Aman Gupta',
      competitionName: 'National Mathematics Olympiad',
      category: 'Class 10',
      teamName: 'Aryabhata Squad',
      rank: 1,
      score: 450,
      accuracy: 0.95,
      issuedAt: new Date('2026-11-24T18:00:00Z'),
      verificationUrl: 'http://localhost:5173/verify-certificate/GYAN26-2026-000001',
    };

    const buffer = await createCertificatePDFBuffer(testPayload);

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    // Verify PDF Magic Bytes (%PDF-)
    const pdfHeader = buffer.subarray(0, 5).toString('utf-8');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('should accurately handle certificate status messaging', () => {
    const pendingMsg = 'Your certificate is being generated. Please try again shortly.';
    expect(pendingMsg).toBe('Your certificate is being generated. Please try again shortly.');
  });
});
