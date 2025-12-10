import CollectionRepository from '../repositories/CollectionRepository.js';
import { MonitorRepository } from '../repositories/MonitorRepository.js';
import MonitorService from '../services/monitorService.js';

/**
 * Collections Controller - handles HTTP requests for collections
 */
class CollectionsController {
  /**
   * Get all collections for the authenticated user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getAll(req, res) {
    try {
      const userId = req.user.id;
      const collections =
        await CollectionRepository.findByUserIdWithStats(userId);

      res.json({
        success: true,
        data: collections,
      });
    } catch (error) {
      console.error('Error fetching collections:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch collections',
        error: error.message,
      });
    }
  }

  /**
   * Get a single collection by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await CollectionRepository.findById(parseInt(id));

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found',
        });
      }

      // Verify ownership
      if (collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Get collection with stats
      const collectionWithStats =
        await CollectionRepository.getCollectionWithStats(parseInt(id));

      res.json({
        success: true,
        data: collectionWithStats,
      });
    } catch (error) {
      console.error('Error fetching collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch collection',
        error: error.message,
      });
    }
  }

  /**
   * Create a new collection
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async create(req, res) {
    try {
      const userId = req.user.id;
      const { name, description, color } = req.body;

      // Validation
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Collection name is required',
        });
      }

      const collection = await CollectionRepository.create({
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3B82F6',
      });

      res.status(201).json({
        success: true,
        data: collection,
        message: 'Collection created successfully',
      });
    } catch (error) {
      console.error('Error creating collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create collection',
        error: error.message,
      });
    }
  }

  /**
   * Update a collection
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, description, color } = req.body;

      const collection = await CollectionRepository.findById(parseInt(id));

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found',
        });
      }

      // Verify ownership
      if (collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Validation
      if (name !== undefined && name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Collection name cannot be empty',
        });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined)
        updateData.description = description?.trim() || null;
      if (color !== undefined) updateData.color = color;

      const updated = await CollectionRepository.update(
        parseInt(id),
        updateData,
      );

      res.json({
        success: true,
        data: updated,
        message: 'Collection updated successfully',
      });
    } catch (error) {
      console.error('Error updating collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update collection',
        error: error.message,
      });
    }
  }

  /**
   * Delete a collection (CASCADE deletes all monitors in the collection)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await CollectionRepository.findById(parseInt(id));

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found',
        });
      }

      // Verify ownership
      if (collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Get monitor count for confirmation
      const monitorCount = await CollectionRepository.countMonitors(
        parseInt(id),
      );

      // Delete collection (CASCADE will delete all monitors)
      await CollectionRepository.delete(parseInt(id));

      res.json({
        success: true,
        message: `Collection deleted successfully. ${monitorCount} monitor(s) were also deleted.`,
      });
    } catch (error) {
      console.error('Error deleting collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete collection',
        error: error.message,
      });
    }
  }

  /**
   * Get all monitors in a collection
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getMonitors(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await CollectionRepository.findById(parseInt(id));

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found',
        });
      }

      // Verify ownership
      if (collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const monitors = await CollectionRepository.getMonitorsInCollection(
        parseInt(id),
      );

      // Add uptime percentage to each monitor
      const monitorsWithStats = monitors.map((monitor) => ({
        ...monitor,
        uptimePercentage: MonitorRepository.calculateUptimePercentage(monitor),
      }));

      res.json({
        success: true,
        data: monitorsWithStats,
      });
    } catch (error) {
      console.error('Error fetching collection monitors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch collection monitors',
        error: error.message,
      });
    }
  }

  /**
   * Trigger health checks for all monitors in a collection (parallel execution)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async checkAll(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const collection = await CollectionRepository.findById(parseInt(id));

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found',
        });
      }

      // Verify ownership
      if (collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Get all monitors in the collection
      const monitors = await CollectionRepository.getMonitorsInCollection(
        parseInt(id),
      );

      if (monitors.length === 0) {
        return res.json({
          success: true,
          message: 'No monitors in this collection',
          data: { checked: 0 },
        });
      }

      // Trigger checks for all monitors in parallel
      // Don't await - return response immediately and checks run in background
      const checkPromises = monitors.map((monitor) =>
        MonitorService.executeCheck(monitor).catch((error) => {
          console.error(`Error checking monitor ${monitor.id}:`, error);
          return { error: true, monitorId: monitor.id };
        }),
      );

      // Start checks in background
      Promise.all(checkPromises).then(() => {
        console.log(`Completed checks for all monitors in collection ${id}`);
      });

      res.json({
        success: true,
        message: `Triggered health checks for ${monitors.length} monitor(s) in collection`,
        data: {
          checked: monitors.length,
          collectionId: parseInt(id),
        },
      });
    } catch (error) {
      console.error('Error triggering collection checks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger collection checks',
        error: error.message,
      });
    }
  }

  /**
   * Move a monitor to a collection
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async addMonitor(req, res) {
    try {
      const { id } = req.params; // collection id
      const { monitorId } = req.body;
      const userId = req.user.id;

      if (!monitorId) {
        return res.status(400).json({
          success: false,
          message: 'Monitor ID is required',
        });
      }

      const collection = await CollectionRepository.findById(parseInt(id));

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found',
        });
      }

      // Verify ownership
      if (collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Verify monitor exists and belongs to user
      const monitor = await MonitorRepository.findById(parseInt(monitorId));

      if (!monitor) {
        return res.status(404).json({
          success: false,
          message: 'Monitor not found',
        });
      }

      if (monitor.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to monitor',
        });
      }

      // Move monitor to collection
      const updated = await CollectionRepository.moveMonitorToCollection(
        parseInt(monitorId),
        parseInt(id),
      );

      res.json({
        success: true,
        data: updated,
        message: 'Monitor added to collection',
      });
    } catch (error) {
      console.error('Error adding monitor to collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add monitor to collection',
        error: error.message,
      });
    }
  }

  /**
   * Remove a monitor from a collection (set collection_id to null)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async removeMonitor(req, res) {
    try {
      const { id, monitorId } = req.params;
      const userId = req.user.id;

      const collection = await CollectionRepository.findById(parseInt(id));

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found',
        });
      }

      // Verify ownership
      if (collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Verify monitor exists and belongs to user
      const monitor = await MonitorRepository.findById(parseInt(monitorId));

      if (!monitor) {
        return res.status(404).json({
          success: false,
          message: 'Monitor not found',
        });
      }

      if (monitor.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to monitor',
        });
      }

      // Remove monitor from collection (set to null)
      const updated = await CollectionRepository.moveMonitorToCollection(
        parseInt(monitorId),
        null,
      );

      res.json({
        success: true,
        data: updated,
        message: 'Monitor removed from collection',
      });
    } catch (error) {
      console.error('Error removing monitor from collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove monitor from collection',
        error: error.message,
      });
    }
  }
}

export default new CollectionsController();
