// Regression guard for the Student Batches feature (sql/59 + Batches tab).
// Loads the Batches tab as admin, asserts seeded batches render + the
// add-student picker populates — without hardcoding row counts.

const { test, expect } = require('@playwright/test');
const { env } = require('../lib/env');

async function loginAdmin(page) {
  await page.goto('/login.html');
  await page.fill('#email', env.adminEmail);
  await page.fill('#password', env.adminPass);
  await page.click('#loginBtn');
  await page.waitForTimeout(4500);
  await expect(page).toHaveURL(/instructor-dashboard\.html/, { timeout: 15000 });
}

test('Batches tab opens, lists seeded batches and loads the student picker', async ({ page }) => {
  test.skip(!process.env.LMS_ADMIN_EMAIL, 'LMS_ADMIN_EMAIL not set');
  await loginAdmin(page);

  const batchesTab = page.locator('[data-tab="batches"]');
  await expect(batchesTab).toBeVisible();
  await batchesTab.click();

  // Seeded test-users batch appears with a member count.
  await expect(page.locator('#batchListContainer .batch-card').first()).toBeVisible({ timeout: 20000 });
  const cardText = (await page.locator('#batchListContainer .batch-card').first().textContent()) || '';
  expect(cardText).toContain('students');

  // The "add student" picker gets populated from the admin overview roster.
  const opts = await page.locator('#batchAddStudentSelect option').count();
  expect(opts).toBeGreaterThan(1);
});