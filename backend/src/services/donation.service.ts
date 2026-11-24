import QRCode from 'qrcode';
import { DonationSettings } from '../models/DonationSettings.js';
import { logAudit } from './audit.service.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export interface UpiUriParams {
  upiId: string;
  payeeName: string;
  amount?: number;
  notes?: string;
}

export interface UpdateDonationInput {
  upiId?: string;
  payeeName?: string;
  suggestedAmounts?: number[];
  notes?: string;
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;
    accountHolder?: string;
  };
  taxExemptionNote?: string;
}

/**
 * Builds standard NPCI UPI URI string.
 * Example: upi://pay?pa=gyan26@upi&pn=GYAN-26%20Educational%20Trust&am=501.00&cu=INR&tn=Shagun%20for%20student%20prize%20fund
 */
export function buildUpiUri(params: UpiUriParams): string {
  const upiId = (params.upiId || 'gyan26@upi').trim();
  const payeeName = (params.payeeName || 'GYAN-26 Educational Trust').trim();
  const { amount, notes } = params;
  const encodedName = encodeURIComponent(payeeName);
  let uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodedName}&cu=INR`;

  if (amount !== undefined && amount > 0) {
    uri += `&am=${amount.toFixed(2)}`;
  }

  if (notes && notes.trim().length > 0) {
    uri += `&tn=${encodeURIComponent(notes.trim())}`;
  }

  return uri;
}

/**
 * Generates Base64 Data URL for a given UPI URI string.
 */
export async function generateUpiQrCode(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0A192F', // Navy-900 brand color
      light: '#FFFFFF',
    },
  });
}

/**
 * Retrieves the active donation settings, initializing default if not yet present.
 */
export async function getDonationSettings() {
  let settings = await DonationSettings.findOne({ isActive: true });

  if (!settings) {
    settings = await DonationSettings.create({
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
      taxExemptionNote:
        'Donations are utilized 100% towards student scholarships, prizes, and quiz operations.',
      isActive: true,
    });
  }

  const defaultUpiUri = buildUpiUri({
    upiId: settings.upiId,
    payeeName: settings.payeeName,
    notes: settings.notes,
  });

  const defaultQrCode = await generateUpiQrCode(defaultUpiUri);

  return {
    settings: settings.toObject(),
    defaultUpiUri,
    defaultQrCode,
  };
}

/**
 * Generates custom QR code and UPI URI for a specified amount and note.
 */
export async function generateCustomQr(amount: number, customNote?: string) {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw AppError.badRequest('Please provide a valid positive donation amount.');
  }

  if (amount > 1000000) {
    throw AppError.badRequest('Donation amount exceeds standard single UPI transaction limit (₹10,00,000).');
  }

  let settings = await DonationSettings.findOne({ isActive: true });
  if (!settings) {
    settings = await DonationSettings.create({});
  }

  const upiId = settings?.upiId || 'gyan26@upi';
  const payeeName = settings?.payeeName || 'GYAN-26 Educational Trust';
  const notes = customNote?.trim() || settings?.notes || 'Shagun for student prize fund';
  const upiUri = buildUpiUri({
    upiId,
    payeeName,
    amount,
    notes,
  });

  const qrCodeDataUrl = await generateUpiQrCode(upiUri);

  return {
    upiUri,
    qrCodeDataUrl,
    amount,
    upiId,
    payeeName,
    notes,
  };
}

/**
 * Updates donation settings (Admin only).
 */
export async function updateDonationSettings(
  userId: string,
  updateData: UpdateDonationInput,
  ipAddress?: string
) {
  let settings = await DonationSettings.findOne({ isActive: true });

  if (!settings) {
    settings = new DonationSettings();
  }

  if (updateData.upiId) settings.upiId = updateData.upiId.trim();
  if (updateData.payeeName) settings.payeeName = updateData.payeeName.trim();
  if (updateData.notes !== undefined) settings.notes = updateData.notes.trim();
  if (updateData.suggestedAmounts && Array.isArray(updateData.suggestedAmounts)) {
    settings.suggestedAmounts = updateData.suggestedAmounts.filter((n) => typeof n === 'number' && n > 0);
  }
  if (updateData.bankDetails) {
    settings.bankDetails = {
      accountNumber: updateData.bankDetails.accountNumber?.trim() || settings.bankDetails?.accountNumber || '',
      ifsc: updateData.bankDetails.ifsc?.trim().toUpperCase() || settings.bankDetails?.ifsc || '',
      bankName: updateData.bankDetails.bankName?.trim() || settings.bankDetails?.bankName || '',
      branch: updateData.bankDetails.branch?.trim() || settings.bankDetails?.branch || '',
      accountHolder: updateData.bankDetails.accountHolder?.trim() || settings.bankDetails?.accountHolder || '',
    };
  }
  if (updateData.taxExemptionNote !== undefined) {
    settings.taxExemptionNote = updateData.taxExemptionNote.trim();
  }

  // @ts-expect-error Mongoose object id assignment
  settings.updatedBy = userId;

  await settings.save();

  await logAudit({
    userId,
    action: 'DONATION_SETTINGS_UPDATED',
    entityType: 'DonationSettings',
    entityId: settings._id.toString(),
    details: {
      upiId: settings.upiId,
      payeeName: settings.payeeName,
      suggestedAmounts: settings.suggestedAmounts,
    },
    ipAddress,
  });

  logger.info({ userId, upiId: settings.upiId }, 'Donation settings updated successfully');

  return settings;
}
