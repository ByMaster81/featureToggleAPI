module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Projenin herhangi bir yerindeki .test.ts veya .spec.ts dosyalarını bulur.
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],

  globalSetup: '<rootDir>/tests/setup.ts',
};