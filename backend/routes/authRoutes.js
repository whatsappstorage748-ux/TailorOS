import express from 'express';
import { signup, login, googleLogin, googleSignup, subscribe, getProfile, updateProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/google-signup', googleSignup);

// Protected routes
router.post('/subscribe', authMiddleware, subscribe);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

export default router;
