import prisma from '../../lib/prisma';

export const findAllTenants = async () => {
  return prisma.tenant.findMany({
    orderBy: { name: 'asc' }, // Alfabetik sırala
  });
};