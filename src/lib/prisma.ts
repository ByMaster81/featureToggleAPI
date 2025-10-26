import { PrismaClient } from '@prisma/client';

// PrismaClient'ın tek bir örneğini oluşturup dışa aktarıyoruz.
const prisma = new PrismaClient();

export default prisma;