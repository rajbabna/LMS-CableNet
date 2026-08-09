// @ts-check
const { defineConfig } = require('@playwright/test');

// Local static site server: python http.server keeps the repo dependency-free.
// Tests hit this URL (same origin, so Supabase auth flows behave like prod).
const BASE_URL = process.env.LMS_BASE_URL || 'http://localhost:4173';

module.exports = defineConfig({
  testDir: './specs',
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ],
webServer: {
    command: process.env.LM_SKIP_SERVER === '1'
      ? 'node -e "1"'
      : 'python -m http.server 4173 --bind 127.0.0.1',
    cwd: require('path').join(__dirname, '..'),
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});