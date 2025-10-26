import { Prisma, FeatureFlag, ActionType } from '@prisma/client';
import prisma from '../../lib/prisma';
import redisClient from '../../lib/redis';
import { createAuditLog } from './audit.service';

// --- Arayüzler (Interfaces) ---

interface GetFeaturesOptions {
  page?: number;
  limit?: number;
  filter?: {
    featureName?: string;
    enabled?: boolean;
  };
}
type UpsertFeatureFlagData = Omit<FeatureFlag, 'id' | 'updatedAt' | 'actor'> & { actor: string };
interface DeleteFeatureFlagData {
  tenantId: string;
  featureId: string;
  env: string;
  actor: string;
}

// --- Yardımcı Fonksiyonlar ---

const getTenantNameById = async (tenantId: string): Promise<string | null> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  return tenant?.name || null;
};

// --- Ana Servis Fonksiyonları ---

export const getFeaturesByTenantAndEnv = async (
  tenantName: string,
  env: string,
  options: GetFeaturesOptions = {}
) => {
  const tenant = await prisma.tenant.findUnique({
    where: { name: tenantName },
  });
  if (!tenant) {
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
  }
  const where: Prisma.FeatureFlagWhereInput = {
    tenantId: tenant.id,
    env,
  };
  if (options.filter?.featureName) {
    where.feature = { name: { contains: options.filter.featureName, mode: 'insensitive' } };
  }
  if (typeof options.filter?.enabled === 'boolean') {
    where.enabled = options.filter.enabled;
  }
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  const [featureFlags, total] = await prisma.$transaction([
    prisma.featureFlag.findMany({
      where,
      include: { feature: true },
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.featureFlag.count({ where }),
  ]);
  return { data: featureFlags, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

export const findAllFeatureDefinitions = async () => {
  return prisma.feature.findMany({
    orderBy: {
      name: 'asc',
    },
  });
};

export const upsertFeatureFlag = async (data: UpsertFeatureFlagData) => {
  const { actor, tenantId, featureId, env, ...updateData } = data;
  const existingFlag = await prisma.featureFlag.findUnique({
    where: { tenantId_featureId_env: { tenantId, featureId, env } },
  });
  const newFlag = await prisma.featureFlag.upsert({
    where: { tenantId_featureId_env: { tenantId, featureId, env } },
    update: { ...updateData, evaluationDetailsJson: updateData.evaluationDetailsJson === null ? Prisma.JsonNull : updateData.evaluationDetailsJson },
    create: { tenantId, featureId, env, ...updateData, evaluationDetailsJson: updateData.evaluationDetailsJson === null ? Prisma.JsonNull : updateData.evaluationDetailsJson },
  });
  const tenantName = await getTenantNameById(newFlag.tenantId);
  if (tenantName) {
    const cacheKey = `features:raw:${tenantName}:${newFlag.env}`;
    await redisClient.del(cacheKey);
  }
  await createAuditLog(
    actor,
    existingFlag ? ActionType.UPDATE : ActionType.CREATE,
    newFlag.id,
    existingFlag,
    newFlag
  );
  return newFlag;
};

export const deleteFeatureFlag = async (data: DeleteFeatureFlagData) => {
  const { actor, tenantId, featureId, env } = data;
  const flagToDelete = await prisma.featureFlag.findUnique({
    where: { tenantId_featureId_env: { tenantId, featureId, env } },
  });
  if (!flagToDelete) { throw new Error('Silinecek feature flag bulunamadı.'); }
  await prisma.featureFlag.delete({ where: { id: flagToDelete.id } });
  const tenantName = await getTenantNameById(flagToDelete.tenantId);
  if (tenantName) {
    const cacheKey = `features:raw:${tenantName}:${flagToDelete.env}`;
    await redisClient.del(cacheKey);
  }
  await createAuditLog(
    actor,
    ActionType.DELETE,
    flagToDelete.id,
    flagToDelete,
    null
  );
  return flagToDelete;
};

export const promoteEnvironmentFlags = async (
  tenantId: string,
  sourceEnv: string,
  targetEnv: string,
  actor: string,
  dryRun: boolean = false
) => {
  const sourceFlags = await prisma.featureFlag.findMany({
    where: { tenantId, env: sourceEnv },
  });

  if (sourceFlags.length === 0) {
    return { message: 'Kaynak ortamda taşınacak flag bulunamadı.', created: 0, updated: 0, actions: [] };
  }

  const report = {
    message: '',
    created: 0,
    updated: 0,
    actions: [] as string[],
  };

  const targetFlags = await prisma.featureFlag.findMany({
    where: { tenantId, env: targetEnv },
  });
  const targetFlagsMap = new Map(targetFlags.map(f => [f.featureId, f]));

  if (dryRun) {
    report.message = `DRY RUN: '${sourceEnv}' ortamından '${targetEnv}' ortamına promosyon raporu.`;
    for (const sourceFlag of sourceFlags) {
      // Feature adını rapora eklemek için, sourceFlags sorgusuna 'include' eklemek gerekir.
      // Şimdilik basit tutmak için featureId kullanıyoruz.
      if (targetFlagsMap.has(sourceFlag.featureId)) {
        report.updated++;
        report.actions.push(`UPDATE: Feature ID '${sourceFlag.featureId}' güncellenecek.`);
      } else {
        report.created++;
        report.actions.push(`CREATE: Feature ID '${sourceFlag.featureId}' oluşturulacak.`);
      }
    }
    return report;
  }

  await prisma.$transaction(async (tx) => {
    for (const sourceFlag of sourceFlags) {
      const { id, tenantId: _tenantId, env: _env, updatedAt, ...flagData } = sourceFlag;
      const existingTargetFlag = targetFlagsMap.get(sourceFlag.featureId);

      const newFlag = await tx.featureFlag.upsert({
        where: {
          tenantId_featureId_env: { tenantId, featureId: sourceFlag.featureId, env: targetEnv },
        },
        create: {
          tenantId,
          env: targetEnv,
          ...flagData,
          evaluationDetailsJson: flagData.evaluationDetailsJson === null ? Prisma.JsonNull : flagData.evaluationDetailsJson,
        },
        update: {
          ...flagData,
          evaluationDetailsJson: flagData.evaluationDetailsJson === null ? Prisma.JsonNull : flagData.evaluationDetailsJson,
        },
      });

      if (existingTargetFlag) {
        report.updated++;
      } else {
        report.created++;
      }

      await createAuditLog(
        actor,
        existingTargetFlag ? ActionType.UPDATE : ActionType.CREATE,
        newFlag.id,
        existingTargetFlag || null,
        newFlag
      );
    }
  });

  const tenantName = await getTenantNameById(tenantId);
  if (tenantName) {
    await redisClient.del(`features:raw:${tenantName}:${targetEnv}`);
  }

  report.message = `Promosyon tamamlandı: ${report.created} flag oluşturuldu, ${report.updated} flag güncellendi.`;
  return report;
};