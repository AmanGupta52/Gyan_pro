import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as donationService from '../services/donation.service.js';
import type { AuthPayload } from '../types/index.js';

const customQrQuerySchema = z.object({
  amount: z.coerce.number().positive().max(1000000),
  note: z.string().max(100).optional(),
});

const updateDonationSettingsSchema = z.object({
  upiId: z.string().min(3).max(100).optional(),
  payeeName: z.string().min(2).max(150).optional(),
  suggestedAmounts: z.array(z.number().positive()).min(1).max(10).optional(),
  notes: z.string().max(200).optional(),
  bankDetails: z
    .object({
      accountNumber: z.string().min(5).max(30).optional(),
      ifsc: z.string().min(4).max(15).optional(),
      bankName: z.string().min(2).max(100).optional(),
      branch: z.string().min(2).max(100).optional(),
      accountHolder: z.string().min(2).max(150).optional(),
    })
    .optional(),
  taxExemptionNote: z.string().max(500).optional(),
});

/**
 * GET /api/donations/settings
 * Public endpoint to retrieve active UPI, bank details, and default QR code.
 */
export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await donationService.getDonationSettings();
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/donations/qr?amount=501&note=Student%20Prize
 * Public endpoint to generate custom amount UPI URI and QR code.
 */
export async function getCustomQr(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = customQrQuerySchema.parse(req.query);
    const data = await donationService.generateCustomQr(parsed.amount, parsed.note);
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/donations/admin/settings or PUT /api/admin/donations/settings
 * Admin endpoint to update UPI parameters and bank info.
 */
export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as AuthPayload;
    const validated = updateDonationSettingsSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress;

    const updated = await donationService.updateDonationSettings(user.userId, validated, ipAddress);

    res.status(200).json({
      status: 'success',
      message: 'Donation settings updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
