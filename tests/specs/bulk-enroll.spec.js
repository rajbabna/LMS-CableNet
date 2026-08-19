// Regression guard for Bulk Enroll from Spreadsheet (Quick Actions → Upload).
// By default this only validates the upload → parse → preview pipeline (read-only).
// Set LMS_BULK_ENROLL=1 to actually create the two TEST-flagged students end to end.
// NOTE: the enroll path writes to the live Supabase project, so it is opt-in.

const { test, expect } = require('@playwright/test');
const { env } = require('../lib/env');

const runEnroll = process.env.LMS_BULK_ENROLL === '1';

async function loginAdmin(page) {
  await page.goto('/login.html');
  await page.fill('#email', env.adminEmail);
  await page.fill('#password', env.adminPass);
  await page.click('#loginBtn');
  await page.waitForTimeout(4500);
  await expect(page).toHaveURL(/instructor-dashboard\.html/, { timeout: 15000 });
}

test('Bulk enroll modal parses a CSV, previews rows and (opt-in) enrolls', async ({ page }) => {
  test.skip(!process.env.LMS_ADMIN_EMAIL, 'LMS_ADMIN_EMAIL not set');
  await loginAdmin(page);

  // The upload button sits in Quick Actions on the default dashboard tab.
  const bulkBtn = page.locator('#bulkEnrollBtn');
  await expect(bulkBtn).toBeVisible({ timeout: 15000 });
  await bulkBtn.click();

  const modal = page.locator('#bulkEnrollModal');
  await expect(modal).toBeVisible();

  // Template download works.
  const dl = page.waitForEvent('download');
  await page.locator('#bulkEnrollModal .btn-sm').click();
  const download = await dl;
  expect(download.suggestedFilename()).toContain('template');

  // Upload a CSV with two TEST-flagged rows.
  const stamp = Date.now();
  const emails = [`bulk-e2e-${stamp}-a@example.com`, `bulk-e2e-${stamp}-b@example.com`];
  const csv = [
    'Email,Full Name,Course,Access Duration,Test student',
    `${emails[0]},Alice Bulk,networking,Lifetime,yes`,
    `${emails[1]},Bob Bulk,cabling,30,yes`
  ].join('\n');

  await page.setInputFiles('#bulkFileInput', {
    name: 'students.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8')
  });

  // Preview renders both rows and enables the submit button.
  await expect(page.locator('#bulkStep2')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#bulkPreviewBody tr')).toHaveCount(2);
  const submitBtn = page.locator('#bulkEnrollSubmitBtn');
  await expect(submitBtn).toBeEnabled();
  const summary = (await page.locator('#bulkSummary').textContent()) || '';
  expect(summary).toContain('2 students found');
  expect(summary).toContain('2 ready');

  if (!runEnroll) {
    // Read-only guard: cancel without writing anything.
    await page.locator('#bulkEnrollModal .btn-ghost').click();
    await expect(modal).not.toBeVisible();
    return;
  }

  // Real enroll (opt-in): both rows are created + enrolled as TEST students.
  await submitBtn.click();
  await expect(page.locator('#alert')).toContainText('Bulk enroll finished', { timeout: 30000 });
  await expect(page.locator('#bulkPreviewBody tr').nth(0)).toContainText('created + enrolled', { timeout: 30000 });
  await expect(page.locator('#bulkPreviewBody tr').nth(1)).toContainText('created + enrolled', { timeout: 30000 });

  // The dashboard refreshes and shows one of the new students.
  await page.locator('[data-tab="students"]').click();
  await expect(page.locator('#studentTableBody')).toContainText('Alice Bulk', { timeout: 20000 });
});
