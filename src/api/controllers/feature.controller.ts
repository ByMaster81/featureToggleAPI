import { Request, Response } from 'express';
import * as featureService from '../services/feature.service';
import redisClient from '../../lib/redis';
import { evaluateFlags } from '../services/evaluation.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * Endpoint: GET /api/features/evaluated
 * Amacı: Client uygulamaları için değerlendirilmiş, basit flag listesi döner.
 */
export const getEvaluatedFeatures = async (req: Request, res: Response) => {
  const { tenant: tenantName, env, userId } = req.query;
  if (!tenantName || !env) {
    return res.status(400).json({ message: 'tenant ve env query parametreleri zorunludur.' });
  }
  const cacheKey = `features:raw:${tenantName}:${env}`;
  try {
    let rawFlags;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      rawFlags = JSON.parse(cachedData);
    } else {
      const result = await featureService.getFeaturesByTenantAndEnv(
        tenantName as string,
        env as string,
        {}
      );
      rawFlags = result.data;
      if (rawFlags.length > 0) {
        await redisClient.set(cacheKey, JSON.stringify(rawFlags), 'EX', 300);
      }
    }
    const evaluatedFlags = evaluateFlags(rawFlags, userId as string | undefined);
    return res.status(200).json(evaluatedFlags);
  } catch (error) {
    console.error('Error fetching and evaluating features:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Endpoint: GET /api/features/raw
 * Amacı: Yönetim paneli için ham, detaylı ve sayfalanmış flag listesi döner.
 */
export const getRawFeatures = async (req: Request, res: Response) => {
  const { tenant: tenantName, env, page, limit } = req.query;
  if (!tenantName || !env) {
    return res.status(400).json({ message: 'tenant ve env query parametreleri zorunludur.' });
  }
  try {
    const options = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    };
    const result = await featureService.getFeaturesByTenantAndEnv(
      tenantName as string,
      env as string,
      options
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching raw features:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Endpoint: GET /api/features/definitions
 * Amacı: Sistemde tanımlı olan tüm 'Feature'ların listesini döner.
 */
export const getAllFeatureDefinitions = async (req: Request, res: Response) => {
  try {
    const features = await featureService.findAllFeatureDefinitions();
    res.status(200).json(features);
  } catch (error) {
    console.error('Failed to fetch feature definitions:', error);
    res.status(500).json({ message: 'Failed to fetch feature definitions.' });
  }
};

/**
 * Endpoint: POST /api/features
 * Amacı: Yeni bir feature flag oluşturur veya mevcut olanı günceller.
 */
export const createOrUpdateFeature = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const flagData = req.body;
    flagData.actor = req.user?.id || 'system-fallback';
    const newFlag = await featureService.upsertFeatureFlag(flagData);
    return res.status(201).json(newFlag);
  } catch (error: any) {
    console.error('Error creating/updating feature:', error);
    if (error.code === 'P2003') {
        return res.status(400).json({ message: 'Belirtilen tenantId veya featureId geçersiz.' });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Endpoint: DELETE /api/features
 * Amacı: Bir feature flag'i siler.
 */
export const deleteFeature = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, featureId, env } = req.body;
    if (!tenantId || !featureId || !env) {
      return res.status(400).json({ message: 'tenantId, featureId ve env zorunludur.' });
    }
    const actor = req.user?.id || 'system-fallback';
    const deletedFlag = await featureService.deleteFeatureFlag({ tenantId, featureId, env, actor });
    return res.status(200).json(deletedFlag);
  } catch (error: any) {
    if (error.message.includes('bulunamadı')) {
      return res.status(404).json({ message: error.message });
    }
    console.error('Error deleting feature:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Endpoint: POST /api/features/promote
 * Amacı: Feature flag'leri bir ortamdan diğerine kopyalar.
 */
export const promoteFlags = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, sourceEnv, targetEnv, dryRun } = req.body;
    const actor = req.user?.id || 'system-fallback';

    if (!tenantId || !sourceEnv || !targetEnv) {
      return res.status(400).json({ message: 'tenantId, sourceEnv, ve targetEnv zorunludur.' });
    }
    if (sourceEnv === targetEnv) {
      return res.status(400).json({ message: 'Kaynak ve hedef ortamlar aynı olamaz.' });
    }

    const report = await featureService.promoteEnvironmentFlags(
      tenantId,
      sourceEnv,
      targetEnv,
      actor,
      dryRun
    );

    res.status(200).json(report);
  } catch (error) {
    console.error('Error promoting flags:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};