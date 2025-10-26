import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Bu endpoint'e sadece kimliği doğrulanmış kullanıcılar erişebilmeli.
// GET /api/audit-logs?targetId=...&page=1&limit=10
router.get('/', authenticateToken, getAuditLogs);

export default router;