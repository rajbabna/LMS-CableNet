// js/auth-guard.js
// Protects course pages - ensures only approved, ENROLLED students can access
// Requires js/supabase-client.js to be loaded first (sets window.supabaseClient)
// Sets document.body.dataset.enrolled = "true"|"false" and resolves
// window.authGuardReady (Promise) so later scripts can await the guard.

window.authGuardReady = (async () => {
  try {
    // Check for active session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
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
      window.location.href = 'login.html';
      return;
    }

    // Validate user role and approval
    if (profile.role !== 'student' || !profile.approved) {
      window.location.href = profile.approved ? 'index.html' : 'pending.html';
      return;
    }

    // ---- Course preview flag ----
    // The page's course is declared via <body data-course="cabling"> etc.
    // Students can VIEW any course (preview) but only interact when enrolled.
    // Preview mode is communicated via <body data-enrolled="true|false"> so
    // load-modules.js / progress-tracker.js can disable resources + completion.
    const pageCourse = document.body.dataset.course;
    if (pageCourse) {
      const { data: enrollment } = await supabaseClient
        .from('enrollments')
        .select('course_id')
        .eq('user_id', session.user.id);

      const enrolledCourses = new Set((enrollment || []).map(e => e.course_id));
      const isEnrolled = enrolledCourses.has(pageCourse);

      document.body.dataset.enrolled = isEnrolled ? 'true' : 'false';
      console.log(`Auth guard: course=${pageCourse} enrolled=${isEnrolled}`);

      // Nav links to other courses stay visible so students can preview them
      document.querySelectorAll('[data-target-course]').forEach(link => {
        const targetEnrolled = enrolledCourses.has(link.dataset.targetCourse);
        link.dataset.targetEnrolled = targetEnrolled ? 'true' : 'false';
      });
    } else {
      document.body.dataset.enrolled = 'true';
    }

    // User is approved student - allow access

    // Wire up any [data-action="logout"] links on the page
    document.querySelectorAll('[data-action="logout"]').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
      });
    });
  } catch (err) {
    console.error('Auth guard error:', err);
    window.location.href = 'login.html';
  }
})();
