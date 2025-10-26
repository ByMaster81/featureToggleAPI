import { Request, Response } from 'express';
import * as tenantService from '../services/tenant.service';

export const getAllTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await tenantService.findAllTenants();
    res.status(200).json(tenants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tenants.' });
  }
};