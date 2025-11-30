import express from 'express';
import jwt from 'jsonwebtoken';
import sseService from '../services/sseService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Authenticate token from query parameter for SSE
 */
const authenticateSSEToken = async (req, res, next) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Import UserRepository here to avoid circular dependency
    const { UserRepository } = await import('../repositories/index.js');

    // Find user using the userId from the token
    const user = await UserRepository.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Attach user to request (same as regular auth middleware)
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * SSE endpoint for real-time events
 * GET /api/sse/events?token=<jwt_token>
 */
router.get('/events', authenticateSSEToken, (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User ID is undefined in SSE request');
      return res.status(401).json({
        success: false,
        message: 'User ID not found',
      });
    }

    // Add the connection to SSE service
    sseService.addConnection(userId, res);
  } catch (error) {
    logger.error('Error establishing SSE connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to establish SSE connection',
    });
  }
});

/**
 * Get SSE service status (for debugging)
 * GET /api/sse/status
 */
router.get('/status', authenticateSSEToken, (req, res) => {
  try {
    const status = {
      totalConnections: sseService.getConnectionCount(),
      activeUsers: sseService.getUserCount(),
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error getting SSE status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SSE status',
    });
  }
});

export default router;
