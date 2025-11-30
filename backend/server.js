import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './config/database.js';
import SchedulerService from './services/schedulerService.js';
import EmailService from './services/emailService.js';
import logger, {
  initLogger,
  getMiddleware,
  closeLogger,
} from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import monitorRoutes from './routes/monitors.js';
import checkRoutes from './routes/checks.js';
import settingsRoutes from './routes/settings.js';
import logsRoutes from './routes/logs.js';
import dashboardRoutes from './routes/dashboard.js';
import sseRoutes from './routes/sse.js';
// import apiDocsRoute from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Configure CORS to allow credentialed requests from specific origins
const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000,http://localhost:3001'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow no-origin only in development (for tools like Postman)
      if (!origin && process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      // Allow whitelisted origins
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger middleware will be added after initialization

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/checks', checkRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sse', sseRoutes);

//WARNING: TO BE USED BY DEV TEAM ONLY ---- NOT FOR END USERS ---- KEPT JUST FOR REMINDER PURPOSES ---- MOVE TO SOME OTHER SERVER IN FUTURE

// app.use("/", apiDocsRoute);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    scheduler: SchedulerService.getStatus(),
  });
});

// 404 handler - will be replaced by logger middleware

// Error handler - will be replaced by logger middleware

// Start server
async function startServer() {
  try {
    // Initialize logger first
    await initLogger(app);

    // Add logger middleware
    const middleware = getMiddleware();
    app.use(middleware.request);
    app.use(middleware.error);

    // Connect to database
    await connectDatabase();

    // Initialize email service
    await EmailService.initializeTransporter();

    // Initialize monitors (set nextCheckTime for all enabled monitors)
    await SchedulerService.initializeMonitors();

    // Start scheduler
    SchedulerService.start();

    // Add 404 and error handlers after routes
    app.use(middleware.notFound);
    app.use(middleware.errorHandler);

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('╔════════════════════════════════════════╗');
      logger.info('║   MonitorHealth Backend Server         ║');
      logger.info(`║   Running on http://localhost:${PORT}     ║`);
      logger.info('╚════════════════════════════════════════╝');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  SchedulerService.stop();
  await closeLogger();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  SchedulerService.stop();
  await closeLogger();
  process.exit(0);
});

// Start the application
startServer();
