import { User } from '../models/User.js';
import { CompetitionRegistration } from '../models/CompetitionRegistration.js';
import { AppError } from '../utils/AppError.js';
import { cloudinary } from '../config/cloudinary.js';

/**
 * Mask an email address: r***@gmail.com
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***@***.com';
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

/**
 * Mask a phone number: 98****3210
 */
export function maskPhone(phone?: string): string | undefined {
  if (!phone || phone.length < 6) return undefined;
  const start = phone.slice(0, 2);
  const end = phone.slice(-4);
  return `${start}${'*'.repeat(Math.max(2, phone.length - 6))}${end}`;
}

export async function getUserProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return user.toPublicJSON();
}

export async function updateUserProfile(
  userId: string,
  updateData: {
    name?: string;
    institution?: string;
    city?: string;
    state?: string;
    country?: string;
    educationLevel?: string;
  }
) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (updateData.name) user.name = updateData.name;
  if (updateData.institution !== undefined) user.institution = updateData.institution;
  if (updateData.city !== undefined) user.city = updateData.city;
  if (updateData.state !== undefined) user.state = updateData.state;
  if (updateData.country !== undefined) user.country = updateData.country;
  if (updateData.educationLevel !== undefined) user.educationLevel = updateData.educationLevel;

  await user.save();
  return user.toPublicJSON();
}

export async function uploadAvatar(userId: string, fileBuffer: Buffer, mimetype: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  // Upload to Cloudinary using upload_stream
  const b64 = Buffer.from(fileBuffer).toString('base64');
  const dataURI = `data:${mimetype};base64,${b64}`;

  const uploadResult = await cloudinary.uploader.upload(dataURI, {
    folder: 'gyan26/avatars',
    public_id: `user_${userId}`,
    overwrite: true,
    resource_type: 'image',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  user.photo = uploadResult.secure_url;
  await user.save();

  return { photo: user.photo };
}

export interface PlayerSearchParams {
  query: string;
  competitionId?: string;
  category?: string;
  page?: number;
  limit?: number;
  currentUserId: string;
}

export async function searchPlayers(params: PlayerSearchParams) {
  const { query, competitionId, category, page = 1, limit = 10, currentUserId } = params;

  if (!query || query.trim().length < 2) {
    return { players: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
  }

  const cleanQuery = query.trim();
  const searchRegex = new RegExp(cleanQuery, 'i');

  // If searching for a competition, exclude players already registered in that competition
  let excludedUserIds: string[] = [currentUserId];
  if (competitionId) {
    const existingRegistrations = await CompetitionRegistration.find({
      competitionId,
      status: 'confirmed',
    }).select('memberUserIds');

    for (const reg of existingRegistrations) {
      for (const mId of reg.memberUserIds) {
        excludedUserIds.push(mId.toString());
      }
    }
  }

  // Under-18 protection:
  // Hide minors without guardian consent
  // 18 years ago date:
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

  const filter: Record<string, unknown> = {
    _id: { $nin: excludedUserIds },
    isActive: true,
    $or: [
      { name: searchRegex },
      { email: searchRegex },
      { phone: cleanQuery },
    ],
    // Minor filter: either adult (DOB <= 18 yrs ago) OR minor with guardian consent
    $and: [
      {
        $or: [
          { dateOfBirth: { $lte: eighteenYearsAgo } },
          { guardianConsentAt: { $exists: true, $ne: null } },
        ],
      },
    ],
  };

  if (category) {
    filter.educationLevel = category;
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email phone photo educationLevel city state country dateOfBirth')
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const sanitizedPlayers = users.map((u) => {
    const isMinor = u.dateOfBirth ? new Date(u.dateOfBirth) > eighteenYearsAgo : false;

    return {
      _id: u._id.toString(),
      name: u.name,
      photo: u.photo,
      educationLevel: u.educationLevel,
      city: u.city,
      state: u.state,
      // For minors: never expose email/phone even masked in public search results
      email: isMinor ? undefined : maskEmail(u.email),
      phone: isMinor ? undefined : maskPhone(u.phone),
      isMinor,
    };
  });

  return {
    players: sanitizedPlayers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
