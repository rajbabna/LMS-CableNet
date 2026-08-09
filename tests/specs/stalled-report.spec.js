// Regression guard for the "Stalled students" report (sql/58 + Stalled tab).
// Loads the Stalled tab as admin, asserts the stat cards and table render
// from get_stalled_report() RPC — without hardcoding live row counts.

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

test('Stalled tab opens and renders stat cards from get_stalled_report', async ({ page }) => {
  test.skip(!process.env.LMS_ADMIN_EMAIL, 'LMS_ADMIN_EMAIL not set');
  await loginAdmin(page);

  const stallTab = page.locator('[data-tab="stalled"]');
  await expect(stallTab).toBeVisible();
  await stallTab.click();

  // Stat cards populate asynchronously once the RPC resolves.
  await expect(page.locator('#stallTotal')).not.toHaveText('0', { timeout: 20000 });
  const total = (await page.locator('#stallTotal').textContent()).trim();
  const auto = (await page.locator('#stallAutoCount').textContent()).trim();
  const manual = (await page.locator('#stallManualCount').textContent()).trim();

  // Consistency: auto + manual must equal total.
  expect(Number(auto) + Number(manual)).toBe(Number(total));

  const row = page.locator('#stalledReportBody tr').first();
  await expect(row).toBeVisible();
  // Each report row carries an Un-stall action.
  await expect(row.locator('.btn-unstall')).toBeVisible();
});