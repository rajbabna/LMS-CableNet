// AI Mentor offline notice (js/ai-mentor.js). The widget has no offline cache:
// when the browser reports navigator.onLine === false, opening the chat panel
// must show an amber "needs an internet connection" bar instead of the auth
// state — a state that is almost never exercised in manual testing against a
// live server, so it needs an automated guard.

const { test, expect } = require('@playwright/test');
const { env } = require('../lib/env');

async function loginStudent(page) {
  await page.goto('/login.html');
  await page.fill('#email', env.studentEmail);
  await page.fill('#password', env.studentPass);
  await page.click('#loginBtn');
  await page.waitForTimeout(4500);
  await expect(page).toHaveURL(/student-dashboard\.html/, { timeout: 15000 });
}

test('offline: AI Mentor panel shows the connectivity notice', async ({ page, context }) => {
  test.skip(!env.studentEmail, 'LMS_STUDENT_* not set');
  await loginStudent(page);

  // Course page hosts the AI Mentor widget (launcher + panel).
  await page.goto('/course.html?course=cabling');
  const launcher = page.locator('#aiMentorLauncher');
  await expect(launcher).toBeVisible({ timeout: 20000 });

  // Simulate losing the network BEFORE opening the panel.
  await context.setOffline(true);

  await launcher.click();

  const bar = page.locator('.ai-mentor-offline');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('internet connection');

  // With the offline bar shown, the auth/login prompt is not offered.
  await expect(page.locator('#aiMentorSignIn')).toHaveCount(0);

  // Restore connectivity so the rest of the suite is unaffected.
  await context.setOffline(false);
});

test('online: AI Mentor panel does NOT show the offline notice', async ({ page }) => {
  test.skip(!env.studentEmail, 'LMS_STUDENT_* not set');
  await loginStudent(page);

  await page.goto('/course.html?course=cabling');
  const launcher = page.locator('#aiMentorLauncher');
  await expect(launcher).toBeVisible({ timeout: 20000 });

  // While online, opening the panel must not show the offline bar.
  await launcher.click();
  await page.locator('#aiMentorPanel').waitFor({ state: 'visible' });
  await expect(page.locator('.ai-mentor-offline')).toHaveCount(0);
});