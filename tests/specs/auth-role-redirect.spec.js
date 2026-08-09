// Role-based sign-in redirects — highest-value, lowest-effort safety net.
// Verifies that each role lands on the correct dashboard after login
// (login.html → routeByRole).

const { test, expect } = require('@playwright/test');
const { env, hasStudent, hasInstructor } = require('../lib/env');

async function login(page, email, password) {
  await page.goto('/login.html');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#loginBtn');
  // Any redirect (replace) or error alert resolves within a few seconds.
  await page.waitForTimeout(4500);
}

test('admin login redirects to the instructor/admin dashboard', async ({ page }) => {
  test.skip(!process.env.LMS_ADMIN_EMAIL, 'LMS_ADMIN_EMAIL not set');
  await login(page, env.adminEmail, env.adminPass);
  await expect(page).toHaveURL(/instructor-dashboard\.html/, { timeout: 15000 });
});

test('instructor login redirects to the instructor dashboard', async ({ page }) => {
  test.skip(!hasInstructor, 'LMS_INSTRUCTOR_* not set');
  await login(page, env.instructorEmail, env.instructorPass);
  await expect(page).toHaveURL(/instructor-dashboard\.html/, { timeout: 15000 });
});

test('student login redirects to the student dashboard', async ({ page }) => {
  test.skip(!hasStudent, 'LMS_STUDENT_* not set');
  await login(page, env.studentEmail, env.studentPass);
  await expect(page).toHaveURL(/student-dashboard\.html/, { timeout: 15000 });
});

test('invalid credentials stay on login and show an error', async ({ page }) => {
  await login(page, 'no-such-user@example.com', 'wrong-password');
  await expect(page).toHaveURL(/login\.html/);
  await expect(page.locator('#alert')).toContainText(/Login failed|Invalid/i, { timeout: 15000 });
});