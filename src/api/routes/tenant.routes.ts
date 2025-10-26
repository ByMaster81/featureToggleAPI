import { Router } from 'express';
import { getAllTenants } from '../controllers/tenant.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticateToken, getAllTenants);
export default router;