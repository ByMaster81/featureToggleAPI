import { PrismaClient, EvaluationStrategy } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting advanced seeding process...');

  // Önce mevcut verileri temizleyelim ki her seferinde temiz bir başlangıç yapalım.
  // Not: Bu, production'da ASLA yapılmaz, sadece geliştirme seed'i için geçerlidir.
  await prisma.featureFlag.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.feature.deleteMany({});
  await prisma.tenant.deleteMany({});
  console.log('🧹 Cleaned up existing data.');

  // --- 1. TENANT'LARI OLUŞTUR ---
  const [zebraTenant, nikeTenant] = await Promise.all([
    prisma.tenant.create({ data: { name: 'zebra' } }),
    prisma.tenant.create({ data: { name: 'nike' } }),
  ]);
  console.log(`✅ Created tenants: '${zebraTenant.name}', '${nikeTenant.name}'`);

  // --- 2. ÖZELLİKLERİ (FEATURES) OLUŞTUR ---
  const [dashboard, checkout, darkMode, newApi] = await Promise.all([
    prisma.feature.create({ data: { name: 'new-dashboard', description: 'Yeni ve geliştirilmiş kullanıcı paneli' } }),
    prisma.feature.create({ data: { name: 'beta-checkout', description: 'Yüzdesel olarak dağıtılan yeni ödeme sayfası' } }),
    prisma.feature.create({ data: { name: 'dark-mode', description: 'Arayüz için karanlık mod desteği' } }),
    prisma.feature.create({ data: { name: 'new-api-integration', description: 'Sadece belirli kullanıcılara özel yeni API entegrasyonu' } }),
  ]);
  console.log('✅ Created features: new-dashboard, beta-checkout, dark-mode, new-api-integration');

  // --- 3. FEATURE FLAG'LERİ OLUŞTUR ---

  // === ZEBRA TENANT'I İÇİN FLAG'LER ===
  await prisma.featureFlag.createMany({
    data: [
      // Prod Ortamı
      { tenantId: zebraTenant.id, featureId: dashboard.id, env: 'prod', enabled: true, evaluationStrategy: 'BOOLEAN' },
      { tenantId: zebraTenant.id, featureId: checkout.id, env: 'prod', enabled: true, evaluationStrategy: 'PERCENTAGE', evaluationDetailsJson: { percentage: 50 } },
      
      // Staging Ortamı
      { tenantId: zebraTenant.id, featureId: dashboard.id, env: 'staging', enabled: false, evaluationStrategy: 'BOOLEAN' },
      { tenantId: zebraTenant.id, featureId: darkMode.id, env: 'staging', enabled: true, evaluationStrategy: 'BOOLEAN' },
      { tenantId: zebraTenant.id, featureId: newApi.id, env: 'staging', enabled: true, evaluationStrategy: 'USER', evaluationDetailsJson: { users: ['user-123', 'dev-team@zebra.com'] } },
    ],
  });
  console.log(`🔵 Created feature flags for tenant: '${zebraTenant.name}'`);

  // === NIKE TENANT'I İÇİN FLAG'LER ===
  await prisma.featureFlag.createMany({
    data: [
      // Prod Ortamı
      { tenantId: nikeTenant.id, featureId: dashboard.id, env: 'prod', enabled: false, evaluationStrategy: 'BOOLEAN' }, // Nike'da yeni dashboard kapalı
      { tenantId: nikeTenant.id, featureId: darkMode.id, env: 'prod', enabled: true, evaluationStrategy: 'PERCENTAGE', evaluationDetailsJson: { percentage: 100 } }, // Nike'da dark mode herkese açık
      
      // Dev Ortamı
      { tenantId: nikeTenant.id, featureId: checkout.id, env: 'dev', enabled: true, evaluationStrategy: 'BOOLEAN' },
    ],
  });
  console.log(`🔵 Created feature flags for tenant: '${nikeTenant.name}'`);

  console.log('🏁 Advanced seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });