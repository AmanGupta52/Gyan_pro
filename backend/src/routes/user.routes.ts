import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImage } from '../middleware/upload.js';
import * as userController from '../controllers/user.controller.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getProfile);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.post('/me/avatar', uploadImage.single('avatar'), userController.uploadAvatar);
router.get('/search', userController.searchPlayers);

export default router;
