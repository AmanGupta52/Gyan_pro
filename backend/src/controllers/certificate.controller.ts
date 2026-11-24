import type { Request, Response, NextFunction } from 'express';
import {
  verifyCertificateById,
  getUserCertificates,
  getCertificateBuffer,
  issueCertificatesForCompetition,
} from '../services/certificate.service.js';

export async function verifyCertificateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const certificateId = req.params.certificateId as string;
    const data = await verifyCertificateById(certificateId);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserCertificatesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const certificates = await getUserCertificates(req.user!.userId);

    res.status(200).json({
      status: 'success',
      data: certificates,
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadCertificatePDFHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const certificateId = req.params.certificateId as string;
    const { buffer, filename } = await getCertificateBuffer(certificateId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function adminIssueCertificatesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const competitionId = req.params.competitionId as string;
    const count = await issueCertificatesForCompetition(competitionId);

    res.status(200).json({
      status: 'success',
      message: `Successfully issued ${count} certificates.`,
      count,
    });
  } catch (err) {
    next(err);
  }
}
