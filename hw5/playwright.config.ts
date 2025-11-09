import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests-e2e',
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      MOCK_PUSHER: '1',
      NEXT_PUBLIC_MOCK_PUSHER: '1',
    },
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    baseURL: 'http://localhost:3000',
    env: {
      MOCK_PUSHER: '1',
      NEXT_PUBLIC_MOCK_PUSHER: '1',
    },
  },
});


