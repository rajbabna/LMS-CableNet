// Regression guard for "Remove student from course" (sql/61 + Remove button).
// Asserts the Remove action is present in the Students table and that the
// confirmation modal works (opens, confirm required before submit) — without
// actually deleting a live enrollment (destructive; the RPC needs a throwaway
// account to test end-to-end).

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

test('Remove button opens the confirm modal and is gated by the confirm checkbox', async ({ page }) => {
  test.skip(!process.env.LMS_ADMIN_EMAIL, 'LMS_ADMIN_EMAIL not set');
  await loginAdmin(page);

  const studentsTab = page.locator('[data-tab="students"]');
  await expect(studentsTab).toBeVisible();
  await studentsTab.click();

  // A student row exists and has a Remove action button.
  const removeBtn = page.locator('button.btn-remove').first();
  await expect(removeBtn).toBeVisible({ timeout: 20000 });
  await removeBtn.click();

  // The confirm modal opens with the right copy and the submit starts disabled.
  const modal = page.locator('#removeModal');
  await expect(modal).toBeVisible();
  const title = (await page.locator('#removeModalTitle').textContent()) || '';
  expect(title).toContain('Remove');
  const copy = (await page.locator('#removeStudentCopy').textContent()) || '';
  expect(copy.toLowerCase()).toContain('this course');

  const submitBtn = page.locator('#removeSubmitBtn');
  await expect(submitBtn).toBeDisabled();

  // Ticking the confirm box enables the submit (we do NOT click submit —
  // that would be a destructive live change).
  await page.locator('#removeConfirmCheck').check();
  await expect(submitBtn).toBeEnabled();

  // Cancel closes the modal and resets the checkbox.
  await page.locator('#removeModal .btn-ghost').click();
  await expect(modal).not.toBeVisible();
  await expect(page.locator('#removeConfirmCheck')).not.toBeChecked();
});