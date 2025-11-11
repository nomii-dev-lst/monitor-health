import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { signup, login, getCurrentUser, refreshToken, logout } from '../controllers/authController.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', signup);

/**
 * POST /api/auth/login
 * User login with username and password
 */
router.post('/login', login);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from cookie
 */
router.post('/refresh', refreshToken);

/**
 * POST /api/auth/logout
 * Logout (clear refresh token)
 */
router.post('/logout', authenticateToken, logout);

export default router;
