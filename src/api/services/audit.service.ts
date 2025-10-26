import { ActionType } from '@prisma/client';
import prisma from '../../lib/prisma';


export const createAuditLog = async (
  actor: string,
  action: ActionType,
  targetId: string,
  diffBefore: any,
  diffAfter: any
) => {
  try {
    await prisma.auditLog.create({
      data: {
        actor,
        action,
        targetEntity: 'FeatureFlag',
        targetId,
        diffBefore: diffBefore || {},
        diffAfter: diffAfter || {},
      },
    });
    console.log(`AUDIT LOG: Actor '${actor}' performed ${action} on FeatureFlag '${targetId}'`);
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};




interface GetLogsOptions {
  page: number;
  limit: number;
}

/**
 * Belirli bir hedefin (örn: bir FeatureFlag) denetim kaydı geçmişini getirir.
 * Sonuçlar sayfalanmış olarak ve en yeniden en eskiye doğru sıralanmış olarak döner.
 * @param targetId - Geçmişi istenen kaydın ID'si
 * @param options - Sayfalama seçenekleri (page, limit)
 */
export const getLogsByTargetId = async (
  targetId: string,
  options: GetLogsOptions
) => {
  const { page, limit } = options;
  const skip = (page - 1) * limit;


  const where = {
    targetId,
    targetEntity: 'FeatureFlag', 
  };


  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc', // En yeni loglar en üstte
      },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};