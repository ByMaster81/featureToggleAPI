import { Router } from 'express';
import featureRoutes from './feature.routes';
import auditRoutes from './audit.routes';
import tenantRoutes from './tenant.routes';
const router = Router();


router.use('/features', featureRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/tenants', tenantRoutes);

export default router;