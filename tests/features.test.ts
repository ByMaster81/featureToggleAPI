// Artık dotenv veya execSync'e burada ihtiyacımız yok, setup script'i hallediyor.
import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import { Server } from 'http';

const prisma = new PrismaClient();
let server: Server;

// Sunucuyu başlatma ve kapatma işlemleri
beforeAll((done) => {
  server = app.listen(done);
});

afterAll((done) => {
  prisma.$disconnect().then(() => {
    server.close(done);
  });
});

describe('Integration Test: /api/features Endpoint', () => {

  // beforeEach bloğu aynı kalıyor, çünkü her testten önce tabloları temizlememiz gerekiyor.
  beforeEach(async () => {
    await prisma.featureFlag.deleteMany({});
    await prisma.feature.deleteMany({});
    await prisma.tenant.deleteMany({});
  });

  it('should fetch features for a valid tenant', async () => {
    const tenant = await prisma.tenant.create({ data: { name: 'tenant-1' } });
    const feature = await prisma.feature.create({ data: { name: 'feature-1' } });
    await prisma.featureFlag.create({
      data: { tenantId: tenant.id, featureId: feature.id, env: 'prod', enabled: true },
    });

    const response = await request(server).get('/api/features?tenant=tenant-1&env=prod');

    expect(response.status).toBe(200);

    // Yanıtın gövdesi (`response.body`) doğrudan bir dizidir.
    expect(response.body).toBeInstanceOf(Array);
    
    // Dizinin uzunluğunu kontrol et
    expect(response.body).toHaveLength(1);
    
    // Dizinin ilk elemanının içeriğini kontrol et
    expect(response.body[0].name).toBe('feature-1');
    expect(response.body[0].enabled).toBe(true);
  });
  
  it('should return 400 if tenant parameter is missing', async () => {
    const response = await request(server).get('/api/features?env=prod');
    expect(response.status).toBe(400);
  });
});