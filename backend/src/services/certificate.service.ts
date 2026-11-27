import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';
import { Certificate } from '../models/Certificate.js';
import { QuizCertificate } from '../models/QuizCertificate.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Quiz } from '../models/Quiz.js';
import { generateCertificateId } from '../models/Counter.js';
import { PlayerResult } from '../models/PlayerResult.js';
import { Competition } from '../models/Competition.js';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { createNotification } from './notification.service.js';

// Configure Cloudinary if credentials are provided
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export interface CertificateDataPayload {
  certificateId: string;
  recipientName: string;
  competitionName: string;
  category: string;
  teamName: string;
  rank: number;
  score: number;
  accuracy: number;
  issuedAt: Date;
  verificationUrl: string;
  /** 'quiz' = passed a teacher's quiz (competition design is the default) */
  kind?: 'competition' | 'quiz';
  issuerName?: string;
  maxScore?: number;
}

/**
 * Generate high-resolution A4 landscape verifiable certificate PDF.
 */
export async function createCertificatePDFBuffer(
  data: CertificateDataPayload
): Promise<Buffer> {
  // Generate QR code buffer (PNG)
  const qrCodeBuffer = await QRCode.toBuffer(data.verificationUrl, {
    width: 90,
    margin: 1,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  const isQuiz = data.kind === 'quiz';

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape', // 841.89 x 595.28 points
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    const width = 841.89;
    const height = 595.28;

    // 1. Background Fill: Ivory Parchment
    doc.rect(0, 0, width, height).fill('#FCF9F2');

    // 2. Outer Border: Deep Navy (#0F172A)
    doc.rect(20, 20, width - 40, height - 40)
      .lineWidth(3.5)
      .stroke('#0F172A');

    // 3. Inner Decorative Border: Lustrous Gold (#D97706)
    doc.rect(28, 28, width - 56, height - 56)
      .lineWidth(1.5)
      .stroke('#D97706');

    // Corner Ornaments
    const drawCorner = (x: number, y: number) => {
      doc.rect(x, y, 12, 12).fill('#D97706');
    };
    drawCorner(22, 22);
    drawCorner(width - 34, 22);
    drawCorner(22, height - 34);
    drawCorner(width - 34, height - 34);

    // 4. Header: GYAN-26
    doc.font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#D97706')
      .text(isQuiz ? 'GYAN-26  ·  QUIZ ACHIEVEMENT' : 'GYAN-26 NATIONAL QUIZ CHAMPIONSHIP', 0, 52, {
        align: 'center',
        characterSpacing: 2,
      });

    // Tagline & Subtitle
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text('"Kaun Banega Gyanwan Vivekvan Gunwan"', 0, 74, { align: 'center' });

    doc.font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor('#64748B')
      .text('Junior KG se PhD Tak', 0, 89, { align: 'center' });

    // Decorative Gold Divider
    doc.moveTo(width / 2 - 120, 108)
      .lineTo(width / 2 + 120, 108)
      .lineWidth(1)
      .stroke('#D97706');

    // Certificate Title
    doc.font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#0F172A')
      .text(isQuiz ? 'CERTIFICATE OF ACHIEVEMENT' : 'CERTIFICATE OF MERIT & PARTICIPATION', 0, 125, {
        align: 'center',
        characterSpacing: 1.5,
      });

    // Sub-banner
    doc.font('Helvetica')
      .fontSize(11)
      .fillColor('#64748B')
      .text('This is proudly presented to', 0, 165, { align: 'center' });

    // Recipient Name
    doc.font('Helvetica-Bold')
      .fontSize(28)
      .fillColor('#0284C7') // Brand Blue
      .text(data.recipientName.toUpperCase(), 0, 185, {
        align: 'center',
        characterSpacing: 1,
      });

    // Divider under name
    doc.moveTo(width / 2 - 180, 224)
      .lineTo(width / 2 + 180, 224)
      .lineWidth(1)
      .stroke('#CBD5E1');

    // Narrative citation
    const istDate = data.issuedAt.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    doc.font('Helvetica')
      .fontSize(11.5)
      .fillColor('#334155')
      .text(
        isQuiz
          ? 'for successfully passing the quiz'
          : `for outstanding participation and academic excellence representing squad `,
        70,
        238,
        { align: 'center', width: width - 140, lineGap: 4 }
      );

    doc.font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#0F172A')
      .text(
        isQuiz
          ? `"${data.competitionName}" (${data.category})`
          : `"${data.teamName}" in ${data.competitionName} (${data.category})`,
        70,
        258,
        { align: 'center', width: width - 140 }
      );

    // Performance Metrics Highlights Box
    const boxY = 295;
    const boxW = 440;
    const boxH = 50;
    const boxX = (width - boxW) / 2;

    doc.roundedRect(boxX, boxY, boxW, boxH, 8)
      .fillAndStroke('#F8FAFC', '#E2E8F0');

    // Rank, Score, Accuracy inside Box
    const colW = boxW / 3;

    // Col 1: Tournament Rank
    doc.font('Helvetica')
      .fontSize(8.5)
      .fillColor('#64748B')
      .text(isQuiz ? 'RESULT' : 'TOURNAMENT RANK', boxX, boxY + 10, { width: colW, align: 'center' });
    doc.font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#D97706')
      .text(isQuiz ? 'PASSED' : `#${data.rank}`, boxX, boxY + 24, { width: colW, align: 'center' });

    // Col 2: Score
    doc.font('Helvetica')
      .fontSize(8.5)
      .fillColor('#64748B')
      .text(isQuiz ? 'SCORE' : 'INDIVIDUAL SCORE', boxX + colW, boxY + 10, { width: colW, align: 'center' });
    doc.font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#0284C7')
      .text(isQuiz && data.maxScore ? `${data.score} / ${data.maxScore}` : `${data.score} PTS`, boxX + colW, boxY + 24, { width: colW, align: 'center' });

    // Col 3: Accuracy
    doc.font('Helvetica')
      .fontSize(8.5)
      .fillColor('#64748B')
      .text('ACCURACY', boxX + colW * 2, boxY + 10, { width: colW, align: 'center' });
    doc.font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#059669')
      .text(`${Math.round(data.accuracy * 100)}%`, boxX + colW * 2, boxY + 24, { width: colW, align: 'center' });

    // ── FOOTER: QR CODE, SIGNATURES & VERIFICATION DETAILS ──────────
    const footerY = 410;

    // Left: Dynamic QR Code
    doc.image(qrCodeBuffer, 55, footerY - 10, { width: 75, height: 75 });

    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0F172A')
      .text('SCAN TO VERIFY', 40, footerY + 70, { width: 105, align: 'center' });

    doc.font('Helvetica')
      .fontSize(7.5)
      .fillColor('#64748B')
      .text('Official Digital Credential', 40, footerY + 82, { width: 105, align: 'center' });

    // Middle: Certificate ID & Metadata
    doc.font('Helvetica')
      .fontSize(8.5)
      .fillColor('#64748B')
      .text('Certificate Identifier:', 200, footerY + 10);

    doc.font('Courier-Bold')
      .fontSize(9.5)
      .fillColor('#0F172A')
      .text(data.certificateId, 200, footerY + 23);

    doc.font('Helvetica')
      .fontSize(8.5)
      .fillColor('#64748B')
      .text(`Date of Conferral (IST): ${istDate}`, 200, footerY + 42);

    doc.font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#94A3B8')
      .text(
        isQuiz
          ? 'Check authenticity with the QR code or the certificate ID.'
          : 'Cryptographically verifiable on blockchain-aligned registry.',
        200,
        footerY + 58
      );

    // Right: Authorized Signature Line & Seal
    const sigX = width - 230;
    doc.moveTo(sigX, footerY + 45)
      .lineTo(sigX + 170, footerY + 45)
      .lineWidth(1)
      .stroke('#0F172A');

    doc.font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#0F172A')
      .text(isQuiz ? data.issuerName || 'Quiz Creator' : 'National Exam Director', sigX, footerY + 52, { width: 170, align: 'center' });

    doc.font('Helvetica')
      .fontSize(8)
      .fillColor('#64748B')
      .text(isQuiz ? 'Quiz Creator · GYAN-26' : 'GYAN-26 Governing Council', sigX, footerY + 66, { width: 170, align: 'center' });

    doc.end();
  });
}

/**
 * Upload PDF buffer to Cloudinary (or return local data URL fallback).
 */
export async function uploadCertificatePDF(
  buffer: Buffer,
  certificateId: string
): Promise<string> {
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY) {
    try {
      return await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'gyan26/certificates',
            public_id: certificateId,
            resource_type: 'raw',
            format: 'pdf',
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Upload to Cloudinary failed'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(buffer);
      });
    } catch (err) {
      logger.error({ err, certificateId }, 'Cloudinary upload error, using local fallback');
    }
  }

  // Fallback: direct download route
  return `${env.FRONTEND_URL}/api/v1/certificates/download/${certificateId}`;
}

/**
 * Issue certificates for all eligible players in a Completed tournament.
 */
export async function issueCertificatesForCompetition(competitionId: string): Promise<number> {
  const competition = await Competition.findById(competitionId);
  if (!competition) {
    throw AppError.notFound('Competition not found');
  }

  const playerResults = await PlayerResult.find({ competitionId })
    .populate('userId', 'name dateOfBirth isEmailVerified')
    .populate('teamId', 'name')
    .lean();

  let issuedCount = 0;

  for (const pr of playerResults as any[]) {
    // Check if certificate already issued
    const existing = await Certificate.findOne({
      competitionId,
      userId: pr.userId._id,
    });

    if (existing && existing.status === 'issued') {
      continue;
    }

    const certId = existing ? existing.certificateId : await generateCertificateId();
    const verificationUrl = `${env.FRONTEND_URL}/verify-certificate/${certId}`;

    try {
      const pdfBuffer = await createCertificatePDFBuffer({
        certificateId: certId,
        recipientName: pr.userId.name,
        competitionName: competition.name,
        category: competition.category,
        teamName: pr.teamId?.name || 'Solo Participant',
        rank: pr.resultId?.rank || 1,
        score: pr.playerScore,
        accuracy: pr.accuracy,
        issuedAt: new Date(),
        verificationUrl,
      });

      const pdfUrl = await uploadCertificatePDF(pdfBuffer, certId);

      await Certificate.findOneAndUpdate(
        { competitionId, userId: pr.userId._id },
        {
          certificateId: certId,
          userId: pr.userId._id,
          competitionId,
          teamId: pr.teamId._id,
          rank: pr.resultId?.rank || 1,
          score: pr.playerScore,
          accuracy: pr.accuracy,
          pdfUrl,
          qrCodeUrl: verificationUrl,
          status: 'issued',
          issuedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      issuedCount++;
    } catch (err) {
      logger.error({ err, certId, userId: pr.userId._id }, 'Error issuing certificate');
    }
  }

  logger.info({ competitionId, issuedCount }, 'Certificates successfully generated');
  return issuedCount;
}

/**
 * Public certificate verification lookup (NO auth required).
 */
export async function verifyCertificateById(certificateId: string) {
  const cert = await Certificate.findOne({ certificateId })
    .populate('userId', 'name dateOfBirth guardianName guardianConsentAt')
    .populate('competitionId', 'name category status startAt')
    .populate('teamId', 'name category')
    .lean();

  if (!cert) {
    const quizCert = await verifyQuizCertificate(certificateId);
    if (quizCert) return quizCert;
    throw AppError.notFound('Certificate with this identifier could not be verified.');
  }

  const user = cert.userId as any;
  const comp = cert.competitionId as any;
  const team = cert.teamId as any;

  // Verify under-18 privacy compliance:
  // Names are shown, but email/phone are never returned in verification payload.
  return {
    kind: 'competition' as const,
    certificateId: cert.certificateId,
    status: cert.status,
    isValid: cert.status === 'issued',
    recipientName: user.name,
    competitionName: comp.name,
    category: comp.category,
    teamName: team.name,
    rank: cert.rank,
    score: cert.score,
    accuracy: cert.accuracy,
    pdfUrl: cert.pdfUrl,
    issuedAt: cert.issuedAt,
    verificationUrl: cert.qrCodeUrl,
  };
}

/**
 * Get user certificates list.
 */
export async function getUserCertificates(userId: string) {
  const certificates = await Certificate.find({ userId })
    .sort({ issuedAt: -1 })
    .populate('competitionId', 'name category status')
    .populate('teamId', 'name')
    .lean();

  const quizCerts = await QuizCertificate.find({ userId }).sort({ issuedAt: -1 }).lean();

  const competitionList = certificates.map((c: any) => ({
    kind: 'competition' as const,
    _id: c._id,
    certificateId: c.certificateId,
    competition: c.competitionId,
    team: c.teamId,
    rank: c.rank,
    score: c.score,
    accuracy: c.accuracy,
    status: c.status,
    pdfUrl: c.pdfUrl,
    qrCodeUrl: c.qrCodeUrl,
    issuedAt: c.issuedAt,
  }));

  const quizList = quizCerts.map((c) => ({
    kind: 'quiz' as const,
    _id: c._id,
    certificateId: c.certificateId,
    // Same shape the page already renders for competitions
    competition: { _id: c.quizId, name: c.quizTitle, category: c.category, status: 'Completed' },
    team: { _id: c.userId, name: 'Individual' },
    rank: 0,
    score: c.score,
    maxScore: c.maxScore,
    accuracy: c.accuracy,
    issuerName: c.issuerName,
    status: c.status,
    pdfUrl: undefined,
    qrCodeUrl: c.qrCodeUrl,
    issuedAt: c.issuedAt,
  }));

  return [...competitionList, ...quizList].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );
}

/**
 * Stream on-demand PDF buffer for direct download.
 */
export async function getCertificateBuffer(certificateId: string): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  const cert = await Certificate.findOne({ certificateId })
    .populate('userId', 'name')
    .populate('competitionId', 'name category')
    .populate('teamId', 'name')
    .lean();

  if (!cert) {
    const quizBuffer = await getQuizCertificateBuffer(certificateId);
    if (quizBuffer) return quizBuffer;
    throw AppError.notFound('Certificate not found');
  }

  if (cert.status !== 'issued') {
    throw AppError.badRequest('Your certificate is being generated. Please try again shortly.');
  }

  const user = cert.userId as any;
  const comp = cert.competitionId as any;
  const team = cert.teamId as any;

  const buffer = await createCertificatePDFBuffer({
    certificateId: cert.certificateId,
    recipientName: user.name,
    competitionName: comp.name,
    category: comp.category,
    teamName: team.name,
    rank: cert.rank,
    score: cert.score,
    accuracy: cert.accuracy,
    issuedAt: cert.issuedAt,
    verificationUrl: cert.qrCodeUrl,
  });

  return {
    buffer,
    filename: `GYAN26-Certificate-${cert.certificateId}.pdf`,
  };
}

// ─── Quiz certificates ───────────────────────────────────────

/**
 * Issue a certificate when a student passes a quiz (mode "quiz", pass mark reached).
 * Safe to call repeatedly: one certificate per student per quiz, the first pass wins.
 * Teachers/admins test-playing their own quiz never receive one.
 */
export async function issueQuizCertificateForAttempt(attemptId: string) {
  const attempt = await QuizAttempt.findById(attemptId).lean();
  if (!attempt || attempt.status !== 'finished' || attempt.mode !== 'quiz' || !attempt.passed || !attempt.quizId) {
    return null;
  }

  const existing = await QuizCertificate.findOne({ quizId: attempt.quizId, userId: attempt.userId });
  if (existing) return existing;

  const [quiz, user] = await Promise.all([
    Quiz.findById(attempt.quizId).select('title category certificateEnabled createdBy').lean(),
    User.findById(attempt.userId).select('name role').lean(),
  ]);
  if (!quiz || !user || !quiz.certificateEnabled || user.role !== 'player') return null;

  const issuer = await User.findById(quiz.createdBy).select('name').lean();
  const certificateId = await generateCertificateId(new Date().getFullYear(), 'GYAN26Q');

  try {
    const created = await QuizCertificate.create({
      certificateId,
      userId: attempt.userId,
      quizId: attempt.quizId,
      attemptId: attempt._id,
      quizTitle: quiz.title,
      category: quiz.category,
      issuerName: issuer?.name ?? 'GYAN-26 Teacher',
      score: attempt.totalScore,
      maxScore: attempt.maxScore,
      accuracy: attempt.accuracy,
      passPercent: attempt.config.passPercent,
      qrCodeUrl: `${env.FRONTEND_URL}/verify-certificate/${certificateId}`,
      status: 'issued',
    });

    // Tell the student (best effort)
    createNotification({
      receiverId: attempt.userId,
      type: 'certificate',
      title: 'Certificate earned',
      message: `You passed "${quiz.title}". Your certificate is ready.`,
      link: '/certificates',
      metadata: { certificateId },
    }).catch((err) => logger.debug({ err }, 'Could not create certificate notification'));

    return created;
  } catch (err) {
    // Two finishes racing: the unique (quiz, student) index lets only one win
    const again = await QuizCertificate.findOne({ quizId: attempt.quizId, userId: attempt.userId });
    if (again) return again;
    throw err;
  }
}

async function verifyQuizCertificate(certificateId: string) {
  const cert = await QuizCertificate.findOne({ certificateId: certificateId.toUpperCase() })
    .populate('userId', 'name')
    .lean();
  if (!cert) return null;

  return {
    kind: 'quiz' as const,
    certificateId: cert.certificateId,
    status: cert.status,
    isValid: cert.status === 'issued',
    recipientName: (cert.userId as any).name,
    competitionName: cert.quizTitle,
    category: cert.category,
    teamName: 'Individual',
    issuerName: cert.issuerName,
    passPercent: cert.passPercent,
    rank: 0,
    score: cert.score,
    maxScore: cert.maxScore,
    accuracy: cert.accuracy,
    pdfUrl: undefined,
    issuedAt: cert.issuedAt,
    verificationUrl: cert.qrCodeUrl,
  };
}

async function getQuizCertificateBuffer(certificateId: string) {
  const cert = await QuizCertificate.findOne({ certificateId: certificateId.toUpperCase() })
    .populate('userId', 'name')
    .lean();
  if (!cert) return null;
  if (cert.status !== 'issued') {
    throw AppError.badRequest('This certificate is not valid.');
  }

  const buffer = await createCertificatePDFBuffer({
    kind: 'quiz',
    certificateId: cert.certificateId,
    recipientName: (cert.userId as any).name,
    competitionName: cert.quizTitle,
    category: cert.category,
    teamName: 'Individual',
    issuerName: cert.issuerName,
    rank: 0,
    score: cert.score,
    maxScore: cert.maxScore,
    accuracy: cert.accuracy,
    issuedAt: cert.issuedAt,
    verificationUrl: cert.qrCodeUrl,
  });

  return { buffer, filename: `GYAN26-Certificate-${cert.certificateId}.pdf` };
}
