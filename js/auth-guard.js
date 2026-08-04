// js/auth-guard.js
// Protects course pages - ensures only approved, ENROLLED students can access.
// Requires js/supabase-client.js to be loaded first (sets window.supabaseClient).
// Sets document.body.dataset.enrolled = "true"|"false" and resolves
// window.authGuardReady (Promise) so later scripts can await the guard.
// Also sets dataset.enrollmentExpired = "true" when an enrollment has lapsed.

// Derives the course slug from the page URL as a fallback for cached HTML
// that lacks <body data-course="...">.
function deriveCourseFromUrl() {
  const fileName = (window.location.pathname.split('/').pop() || '').toLowerCase();
  if (fileName.indexOf('cabling') !== -1) return 'cabling';
  if (fileName.indexOf('networking') !== -1) return 'networking';
  return null;
}

// Returns a site-root path for a top-level page (e.g. 'login.html'),
// e.g. '/LMS-CableNet/login.html' on GitHub Pages or '/login.html' on a local
// web root. Always begins with '/' (webroot-absolute) so redirects stay valid
// from nested lesson pages (lessons/<course>/...) as well as root pages.
function rootRelative(fileName) {
  const parts = (window.location.pathname || '').split('/').filter(Boolean);
  if (parts.length === 0) return fileName;
  // Strip the trailing file plus the 'lessons/<course>/' folders (when the
  // page lives under the lessons tree). Whatever remains is the webroot prefix.
  const depth = parts.includes('lessons') ? 3 : 1;
  const base = parts.slice(0, Math.max(parts.length - depth, 0));
  if (base.length === 0) return '/' + fileName;
  return '/' + base.join('/') + '/' + fileName;
}
const LOGIN_URL = rootRelative('login.html');
const INDEX_URL = rootRelative('index.html');

window.authGuardReady = (async () => {
  try {
    const pageCourse = document.body.dataset.course || deriveCourseFromUrl();

    // ---- Require a session (guests are enrolled by the admin with an
    // account + expiry; there is no self-serve trial) ----
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = LOGIN_URL;
      return;
    }

    // Fetch user profile
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('approved, role')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      window.location.href = LOGIN_URL;
      return;
    }

    // Validate user role and approval
    if (profile.role !== 'student' || !profile.approved) {
      window.location.href = INDEX_URL;
      return;
    }

    // ---- Course preview flag ----
    // The page's course is declared via <body data-course="cabling"> etc.
    // Students can VIEW any course (preview) but only interact when enrolled.
    // Enrollment with an elapsed expires_at counts as NOT enrolled (expired).
    if (pageCourse) {
      const { data: enrollment } = await supabaseClient
        .from('enrollments')
        .select('course_id, expires_at')
        .eq('user_id', session.user.id);

      const enrolledCourses = new Set();
      const expiredCourses = new Set();
      const now = Date.now();
      (enrollment || []).forEach(e => {
        if (e.expires_at && new Date(e.expires_at).getTime() <= now) {
          expiredCourses.add(e.course_id);
        } else {
          enrolledCourses.add(e.course_id);
        }
      });

      const isEnrolled = enrolledCourses.has(pageCourse);
      const isExpired = expiredCourses.has(pageCourse);

      document.body.dataset.enrolled = isEnrolled ? 'true' : 'false';
      document.body.dataset.enrollmentExpired = isExpired ? 'true' : 'false';
      document.body.dataset.course = pageCourse;
      console.log(`Auth guard: course=${pageCourse} enrolled=${isEnrolled} expired=${isExpired}`);

      // Nav links to other courses stay visible so students can preview them
      document.querySelectorAll('[data-target-course]').forEach(link => {
        const targetEnrolled = enrolledCourses.has(link.dataset.targetCourse);
        const targetExpired = expiredCourses.has(link.dataset.targetCourse);
        link.dataset.targetEnrolled = targetEnrolled ? 'true' : 'false';
        link.dataset.targetExpired = targetExpired ? 'true' : 'false';
      });
    } else {
      document.body.dataset.enrolled = 'true';
    }

    // Wire up any [data-action="logout"] links on the page
    document.querySelectorAll('[data-action="logout"]').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = LOGIN_URL;
      });
    });
  } catch (err) {
    console.error('Auth guard error:', err);
    window.location.href = LOGIN_URL;
  }
})();
