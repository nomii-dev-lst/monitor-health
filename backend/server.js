import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import { initializeApp } from './scripts/initialize.js';
import SchedulerService from './services/schedulerService.js';
import EmailService from './services/emailService.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import monitorRoutes from './routes/monitors.js';
import checkRoutes from './routes/checks.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/checks', checkRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    scheduler: SchedulerService.getStatus()
  });
});

// Dashboard summary endpoint
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const { Monitor, CheckResult } = await import('./models/index.js');
    
    const monitors = await Monitor.find();
    const totalMonitors = monitors.length;
    const upMonitors = monitors.filter(m => m.status === 'up').length;
    const downMonitors = monitors.filter(m => m.status === 'down').length;
    const enabledMonitors = monitors.filter(m => m.enabled).length;

    // Recent checks (last 24 hours)
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const recentChecks = await CheckResult.find({
      checkedAt: { $gte: since }
    });

    const totalChecks = recentChecks.length;
    const successfulChecks = recentChecks.filter(c => c.status === 'success').length;
    const failedChecks = recentChecks.filter(c => c.status === 'failure').length;

    res.json({
      success: true,
      summary: {
        totalMonitors,
        upMonitors,
        downMonitors,
        enabledMonitors,
        last24Hours: {
          totalChecks,
          successfulChecks,
          failedChecks,
          uptimePercentage: totalChecks > 0 
            ? ((successfulChecks / totalChecks) * 100).toFixed(2)
            : 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize app (create admin user, default settings)
    await initializeApp();

    // Initialize email service
    await EmailService.initializeTransporter();

    // Start scheduler
    SchedulerService.start();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`╔════════════════════════════════════════╗`);
      logger.info(`║   MonitorHealth Backend Server        ║`);
      logger.info(`║   Running on http://localhost:${PORT}    ║`);
      logger.info(`╚════════════════════════════════════════╝`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  SchedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  SchedulerService.stop();
  process.exit(0);
});

// Start the application
startServer();
