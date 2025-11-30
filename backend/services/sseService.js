import logger from '../utils/logger.js';

/**
 * Server-Sent Events (SSE) Service
 * Manages real-time communication with clients using SSE
 */
class SSEService {
  constructor() {
    // Map of userId -> Set of response objects
    this.connections = new Map();
  }

  /**
   * Add a new SSE connection for a user
   * @param {number} userId - User ID
   * @param {Response} res - Express response object
   */
  addConnection(userId, res) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }

    this.connections.get(userId).add(res);

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection event
    this.sendToConnection(res, 'connected', {
      timestamp: new Date().toISOString(),
      userId: userId,
    });

    // Handle connection cleanup
    res.on('close', () => {
      this.removeConnection(userId, res);
    });

    res.on('error', (error) => {
      logger.error(`SSE connection error for user ${userId}:`, error);
      this.removeConnection(userId, res);
    });
  }

  /**
   * Remove an SSE connection
   * @param {number} userId - User ID
   * @param {Response} res - Express response object
   */
  removeConnection(userId, res) {
    if (this.connections.has(userId)) {
      this.connections.get(userId).delete(res);

      // Clean up empty user connections
      if (this.connections.get(userId).size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  /**
   * Send data to a specific connection
   * @param {Response} res - Express response object
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  sendToConnection(res, event, data) {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(message);
    } catch (error) {
      logger.error('Error sending SSE message:', error);
    }
  }

  /**
   * Emit a new log event to a specific user
   * @param {number} userId - User ID to send to
   * @param {Object} logData - Log data to send
   */
  emitLog(userId, logData) {
    if (!this.connections.has(userId)) {
      return; // No connections for this user
    }

    const connections = this.connections.get(userId);
    const deadConnections = new Set();

    connections.forEach((res) => {
      try {
        this.sendToConnection(res, 'log', logData);
      } catch (error) {
        logger.error(`Error sending log to user ${userId}:`, error);
        deadConnections.add(res);
      }
    });

    // Clean up dead connections
    deadConnections.forEach((res) => {
      this.removeConnection(userId, res);
    });
  }

  /**
   * Emit updated statistics to a specific user
   * @param {number} userId - User ID to send to
   * @param {Object} statsData - Statistics data to send
   */
  emitStats(userId, statsData) {
    if (!this.connections.has(userId)) {
      return; // No connections for this user
    }

    const connections = this.connections.get(userId);
    const deadConnections = new Set();

    connections.forEach((res) => {
      try {
        this.sendToConnection(res, 'stats', statsData);
      } catch (error) {
        logger.error(`Error sending stats to user ${userId}:`, error);
        deadConnections.add(res);
      }
    });

    // Clean up dead connections
    deadConnections.forEach((res) => {
      this.removeConnection(userId, res);
    });
  }

  /**
   * Get the number of active connections
   * @returns {number} Total number of active connections
   */
  getConnectionCount() {
    let total = 0;
    this.connections.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }

  /**
   * Get the number of users with active connections
   * @returns {number} Number of users with active connections
   */
  getUserCount() {
    return this.connections.size;
  }

  /**
   * Send a heartbeat to all connections to keep them alive
   */
  sendHeartbeat() {
    const heartbeatData = { timestamp: new Date().toISOString() };

    this.connections.forEach((connections, userId) => {
      const deadConnections = new Set();

      connections.forEach((res) => {
        try {
          this.sendToConnection(res, 'heartbeat', heartbeatData);
        } catch {
          deadConnections.add(res);
        }
      });

      // Clean up dead connections
      deadConnections.forEach((res) => {
        this.removeConnection(userId, res);
      });
    });
  }
}

// Create singleton instance
const sseService = new SSEService();

// Send heartbeat every 30 seconds to keep connections alive
setInterval(() => {
  sseService.sendHeartbeat();
}, 30000);

export default sseService;
