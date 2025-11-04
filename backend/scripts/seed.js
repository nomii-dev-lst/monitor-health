import 'dotenv/config';
import { connectDatabase } from '../config/database.js';
import { Monitor } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Seed script to create sample monitors for testing
 */

async function seed() {
  try {
    await connectDatabase();

    logger.info('Seeding sample monitors...');

    // Sample monitors
    const sampleMonitors = [
      {
        name: 'JSONPlaceholder API',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        authType: 'none',
        authConfig: {},
        validationRules: {
          statusCode: 200,
          requiredKeys: ['userId', 'id', 'title', 'body']
        },
        checkInterval: 5, // 5 minutes for testing
        alertEmails: ['admin@example.com'],
        enabled: true
      },
      {
        name: 'GitHub API',
        url: 'https://api.github.com/users/github',
        authType: 'none',
        authConfig: {},
        validationRules: {
          statusCode: 200,
          requiredKeys: ['login', 'id', 'name']
        },
        checkInterval: 10,
        alertEmails: ['admin@example.com'],
        enabled: true
      },
      {
        name: 'Example API (Will Fail)',
        url: 'https://httpstat.us/500',
        authType: 'none',
        authConfig: {},
        validationRules: {
          statusCode: 200
        },
        checkInterval: 15,
        alertEmails: ['admin@example.com'],
        enabled: false // Disabled by default
      }
    ];

    for (const monitorData of sampleMonitors) {
      // Calculate first check time
      const nextCheckTime = new Date();
      nextCheckTime.setMinutes(nextCheckTime.getMinutes() + monitorData.checkInterval);
      monitorData.nextCheckTime = nextCheckTime;

      const monitor = await Monitor.create(monitorData);
      logger.info(`✓ Created monitor: ${monitor.name}`);
    }

    logger.info('✓ Seeding completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
