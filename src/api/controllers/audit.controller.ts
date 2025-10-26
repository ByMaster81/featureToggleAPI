import { Request, Response } from 'express';
import * as auditService from '../services/audit.service';


export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { targetId, page, limit } = req.query;

    if (!targetId) {
      return res.status(400).json({ message: '`targetId` query parametresi zorunludur.' });
    }

    const options = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    };

    const result = await auditService.getLogsByTargetId(
      targetId as string,
      options
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};