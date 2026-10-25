import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,

  // Local 0, CI 2 (public demo over the internet). See README, "Retries".
  retries: isCI ? 2 : 0,

  // 2 workers: many people use this demo shop, and my laptop has little RAM.
  workers: 2,

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://demowebshop.tricentis.com',
    // CI: trace on the retry. Local has no retries, so keep the trace of a failure.
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Full suite on Chromium, only @smoke on Firefox and mobile Safari. See README, "Browsers".
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'chromium',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: './tests/e2e',
      grep: /@smoke/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-safari',
      testDir: './tests/e2e',
      grep: /@smoke/,
      use: { ...devices['iPhone 14'] },
    },
  ],
});
