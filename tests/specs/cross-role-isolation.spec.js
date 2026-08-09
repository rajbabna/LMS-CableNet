// Cross-role isolation — a logged-in STUDENT who hand-types an instructor or
// admin URL must be bounced away, not just visually hidden by CSS.
// (instructor-dashboard.html re-checks profile.role on load and redirects
// students to student-dashboard.html.)

const { test, expect } = require('@playwright/test');
const { env, hasStudent } = require('../lib/env');

async function loginStudent(page) {
  await page.goto('/login.html');
  await page.fill('#email', env.studentEmail);
  await page.fill('#password', env.studentPass);
  await page.click('#loginBtn');
  await page.waitForTimeout(4500);
  await expect(page).toHaveURL(/student-dashboard\.html/, { timeout: 15000 });
}

test('student cannot stay on the instructor/admin dashboard', async ({ page }) => {
  test.skip(!hasStudent, 'LMS_STUDENT_* not set');
  await loginStudent(page);

  // Reach back out and try the staff-only page directly.
  await page.goto('/instructor-dashboard.html');
  await expect(page).toHaveURL(/student-dashboard\.html/, { timeout: 15000 });
});

test('student hidden from seeing the admin Students/Instructors enroll UI', async ({ page }) => {
  test.skip(!hasStudent, 'LMS_STUDENT_* not set');
  await loginStudent(page);

  // If redirect ever fails, the enroll section must also be hidden for students.
  await page.goto('/instructor-dashboard.html');
  await expect(page).toHaveURL(/student-dashboard\.html/, { timeout: 15000 });
});