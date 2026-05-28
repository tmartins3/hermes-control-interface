// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  retries: 0,
  workers: 1,
  globalSetup: './test/global-setup.js',
  reporter: [['list'], ['json', { outputFile: '/tmp/playwright-office-results.json' }]],
  use: {
    baseURL: 'http://localhost:8790',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    ignoreHTTPSErrors: true,
    storageState: path.join(__dirname, '.auth-state.json'),
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
