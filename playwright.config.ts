import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,

  // Retries policy (see README > "Retries policy"):
  // - Local: 0. A failure on your machine should be looked at, not hidden.
  // - CI: 2. The target is a shared public demo over the internet, so a one-off
  //   network hiccup is possible. A test that passes only on retry is reported
  //   as "flaky" in the HTML report, so retries never silently hide a problem.
  retries: isCI ? 2 : 0,

  // 2 workers everywhere: the shop is a public demo shared by many people, and
  // the local machine has limited RAM. Faster runs are not worth hammering it.
  workers: 2,

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://demowebshop.tricentis.com',
    // CI: record a trace only when a test is retried, so the artifact shows
    // exactly the failing attempt. Local runs have no retries, so keep the
    // trace of any failure instead.
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Deliberate browser matrix (see README > "Browser coverage"):
  // the full suite runs once on Chromium; Firefox and mobile WebKit run only the
  // @smoke critical path, because what differs between engines is rendering and
  // input handling on the money path, not server-side pricing rules.
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
