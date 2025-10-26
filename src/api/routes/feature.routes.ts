import { Router } from 'express';
import {
  getEvaluatedFeatures,
  getRawFeatures,
  createOrUpdateFeature,
  deleteFeature,
  promoteFlags,
  getAllFeatureDefinitions, // Yeni fonksiyonu import et
} from '../controllers/feature.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/features/definitions:
 *   get:
 *     summary: Retrieve all feature definitions
 *     description: Fetches a list of all available 'Feature' entities in the system. Used to populate dropdowns in the admin UI. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all feature definitions.
 *       401:
 *         description: Unauthorized.
 */
router.get('/definitions', authenticateToken, getAllFeatureDefinitions);

/**
 * @swagger
 * /api/features/raw:
 *   get:
 *     summary: Retrieve raw feature flags for the admin panel
 *     description: Fetches a detailed, paginated list of feature flags for a given tenant and environment without any evaluation. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: env
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A detailed list of feature flags.
 */
router.get('/raw', authenticateToken, getRawFeatures);

/**
 * @swagger
 * /api/features/evaluated:
 *   get:
 *     summary: Retrieve evaluated feature flags for client applications
 *     description: Fetches and evaluates feature flags for a given tenant and environment. This endpoint is public.
 *     parameters:
 *       - in: query
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: env
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A simple list of evaluated feature flags.
 */
router.get('/evaluated', getEvaluatedFeatures);

/**
 * @swagger
 * /api/features:
 *   post:
 *     summary: Create or update a feature flag
 *     description: Creates or updates a feature flag. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantId:
 *                 type: string
 *               featureId:
 *                 type: string
 *               env:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               evaluationStrategy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created/Updated successfully.
 */
router.post('/', authenticateToken, createOrUpdateFeature);

/**
 * @swagger
 * /api/features:
 *   delete:
 *     summary: Delete a feature flag
 *     description: Deletes a feature flag. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantId:
 *                 type: string
 *               featureId:
 *                 type: string
 *               env:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deleted successfully.
 */
router.delete('/', authenticateToken, deleteFeature);



/**
 * @swagger
 * /api/features/promote:
 *   post:
 *     summary: Promote feature flags from one environment to another
 *     description: Copies all feature flags from a source environment (e.g., 'staging') to a target environment (e.g., 'prod') for a specific tenant. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, sourceEnv, targetEnv]
 *             properties:
 *               tenantId:
 *                 type: string
 *               sourceEnv:
 *                 type: string
 *                 example: 'staging'
 *               targetEnv:
 *                 type: string
 *                 example: 'prod'
 *               dryRun:
 *                 type: boolean
 *                 description: If true, returns a report of changes without applying them.
 *                 default: false
 *     responses:
 *       200:
 *         description: Promotion successful or dry-run report.
 */
router.post('/promote', authenticateToken, promoteFlags);


export default router;