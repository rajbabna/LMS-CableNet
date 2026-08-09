// Env-driven test accounts + base URL.
//
// All credentials come from environment variables (set in a local .env file
// or the shell) so real passwords never live in the repo. The admin defaults
// are intentionally EMPTY — the suite reports a clean failure telling you to
// export them, rather than silently running against the live admin with a
// hardcoded password.
//
// Required env:
//   LMS_ADMIN_EMAIL / LMS_ADMIN_PASS          (admin)
// Optional (role tests are skipped when absent):
//   LMS_STUDENT_EMAIL / LMS_STUDENT_PASS      (student)
//   LMS_INSTRUCTOR_EMAIL / LMS_INSTRUCTOR_PASS

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const env = {
  adminEmail: process.env.LMS_ADMIN_EMAIL || '',
  adminPass: process.env.LMS_ADMIN_PASS || '',
  studentEmail: process.env.LMS_STUDENT_EMAIL || '',
  studentPass: process.env.LMS_STUDENT_PASS || '',
  instructorEmail: process.env.LMS_INSTRUCTOR_EMAIL || '',
  instructorPass: process.env.LMS_INSTRUCTOR_PASS || '',
};

const hasAdmin = Boolean(env.adminEmail && env.adminPass);
const hasStudent = hasAdmin && Boolean(env.studentEmail && env.studentPass);
const hasInstructor = hasAdmin && Boolean(env.instructorEmail && env.instructorPass);

if (!hasAdmin) {
  console.warn(
    '\n[env] LMS_ADMIN_EMAIL / LMS_ADMIN_PASS not set — admin tests will fail.\n' +
    '      Copy tests/.env.example → tests/.env and fill in the accounts you want covered.\n'
  );
}

module.exports = {
  env,
  hasAdmin,
  hasStudent: hasStudent,
  hasInstructor,
};