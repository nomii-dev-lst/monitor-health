import swaggerUi from 'swagger-ui-express';
import { getApiSpec } from '../controllers/apiController.js';
import express from 'express';

const router = express.Router();

/**
 * GET /api-docs
 * Swagger documentation
 */

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(getApiSpec()));

export default router;