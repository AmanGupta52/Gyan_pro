import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { AppError } from '../utils/AppError.js';

// Use memory storage so files are held in RAM buffer and streamed to Cloudinary
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      AppError.badRequest(
        'Invalid file format. Only JPEG, PNG, and WebP images are allowed.'
      )
    );
  }
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1,
  },
});
