import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/index.js';
import UserSessionService from '../services/userSessionService.js';
import { validateSignupData } from '../utils/validation.js';
import logger from '../utils/logger.js';

/**
 * Signup - Create a new user account
 */
export async function signup(req, res) {
  try {
    const { username, email, password } = req.body;

    // Validate input
    const validation = validateSignupData({ username, email, password });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Check if username already exists
    const existingUsername = await UserRepository.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
        errors: { username: 'This username is already taken' },
      });
    }

    // Check if email already exists
    const existingEmail = await UserRepository.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        errors: { email: 'This email is already registered' },
      });
    }

    // Determine user role - first user is admin, rest are regular users
    const allUsers = await UserRepository.findAll();
    const role = allUsers.length === 0 ? 'admin' : 'user';

    // Create user
    const user = await UserRepository.create({
      username,
      email,
      password,
      role,
    });

    logger.info(`User registered: ${username}`);

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    await UserRepository.updateRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Start user's monitors (though they won't have any yet)
    await UserSessionService.login(user.id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Signup error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Signup failed. Please try again.',
    });
  }
}

/**
 * Login - Authenticate existing user
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const user = await UserRepository.findByUsername(username);

    // Don't reveal whether username exists - use generic message
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const isPasswordValid = await UserRepository.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    await UserRepository.updateRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Start user's monitors
    await UserSessionService.login(user.id);

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Unexpected login error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user info,',
      error,
    });
  }
}

export async function refreshToken(req, res) {
  try {
    const { refreshToken: refreshTokenCookie } = req.cookies;

    // Missing refresh token is expected for non-authenticated users
    if (!refreshTokenCookie) {
      return res.status(401).json({
        success: false,
        message: 'No active session',
      });
    }

    const decoded = jwt.verify(
      refreshTokenCookie,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );

    const user = await UserRepository.findByIdWithPassword(decoded.userId);

    if (!user || user.refreshToken !== refreshTokenCookie) {
      return res.status(401).json({
        success: false,
        message: 'Session expired',
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    // JWT errors are expected for expired/invalid tokens
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Session expired',
      });
    }

    // Only log unexpected errors
    console.error('Unexpected refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
    });
  }
}

export async function logout(req, res) {
  try {
    // Stop user's monitors
    await UserSessionService.logout(req.user.id);

    await UserRepository.updateRefreshToken(req.user.id, null);

    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error,
    });
  }
}
