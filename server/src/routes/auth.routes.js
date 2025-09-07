import express from 'express';
import { body } from 'express-validator';
import { register, login, getMe, updateProfile, updatePreferences, updateStatus, refreshToken, uploadAvatar, logout } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadAvatarMiddleware } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', [
  body('username').isLength({ min: 3 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], login);

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/preferences', authenticate, updatePreferences);
router.put('/status', authenticate, updateStatus);
router.post('/refresh-token', authenticate, refreshToken);
router.post('/upload-avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);
router.post('/logout', authenticate, logout);

export default router;