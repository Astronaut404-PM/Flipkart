// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Playwright configuration for Flipkart E2E.
 * Uses env vars for baseURL and auth; generates HTML report and traces on failure.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  reporter: [ ['line'], ['allure-playwright'] ],

/*  reporter: [['html', { open: 'always' }], ['list']],
// Step 1:  After a test execution is completed. allure playwright will create a folder as allure-results on the project level.
We need to open html report from this folder; for this, run below command in CLI:
allure generate ./allure-results --clean
This command will generate allure-report and create a folder as allure-report on the project level.
// Step 2: Use below command to open the allure report:
allure open ./allure-report
This command will open the allure report in a web server. */

// Retry failed tests up to three times for the entire suite
  retries: 3,
  // Retry flaky tests on CI
//  retries: process.env.CI ? 2 : 0,
  // run all tests serially
//  workers: 1,
  // Opt out of parallel tests on CI to reduce flakiness
  workers: process.env.CI ? 2 : undefined,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.BASE_URL || 'https://www.flipkart.com',
    headless: process.env.HEADLESS ? process.env.HEADLESS === 'true' : true,
//    viewport: { width: 1280, height: 800 },
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
//    screenshot: 'only-on-failure',
//    video: 'retain-on-failure',
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
/*    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },*/
  ],
});
