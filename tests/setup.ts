import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

export default async () => {
  // .env dosyasını yükle
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  
  // Ortam değişkenini ayarla
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  console.log('\n[GLOBAL SETUP] Pushing schema to test database...');
  
  // `db push` komutunu kullan. `--skip-generate` client'ı tekrar oluşturmayı atlar ve süreci hızlandırır.
  // `--force-reset` veritabanını önce sıfırlar.
  try {
    execSync('npx prisma db push --force-reset --skip-generate');
    console.log('[GLOBAL SETUP] Schema pushed successfully.');
  } catch(error) {
    console.error('Failed to push schema:', error);
    process.exit(1);
  }
};