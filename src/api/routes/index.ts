import { Router } from 'express';
import featureRoutes from './feature.routes';
import auditRoutes from './audit.routes';
import tenantRoutes from './tenant.routes';
import authRoutes from './auth.routes';
const router = Router();


router.use('/auth', authRoutes);
router.use('/features', featureRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/tenants', tenantRoutes);

export default router;