// ===========================================================
// load-courses.js
// Fetches courses from Supabase and renders them dynamically
// on the landing page (index.html).
// Cards link to the matching course page and show a status
// based on whether the visitor is logged in / enrolled.
// ===========================================================

async function loadCoursesOnLanding() {
  const portsContainer = document.querySelector('.ports');
  
  if (!portsContainer) {
    console.log('No .ports container found — skipping course loading');
    return;
  }

  try {
    // Fetch all courses, ordered by port number
    const { data: courses, error } = await supabaseClient
      .from('courses')
      .select('*')
      .order('port_number', { ascending: true });

    if (error) {
      console.error('Error loading courses:', error);
      return;
    }

    // Determine visitor state (logged in? approved student? which courses?)
    let user = null;
    let profile = null;
    let enrolledCourses = new Set();
    let expiredCourses = new Set();

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      user = session?.user || null;
      if (user) {
        const { data: p } = await supabaseClient
          .from('profiles')
          .select('role, approved')
          .eq('id', user.id)
          .single();
        profile = p || null;

        if (profile && profile.role === 'student') {
          const { data: enr } = await supabaseClient
            .from('enrollments')
            .select('course_id, expires_at')
            .eq('user_id', user.id);
          const now = Date.now();
          (enr || []).forEach(e => {
            if (e.expires_at && new Date(e.expires_at).getTime() <= now) {
              expiredCourses.add(e.course_id);
            } else {
              enrolledCourses.add(e.course_id);
            }
          });
        }
      }
    } catch (err) {
      console.log('Visitor state check skipped:', err);
    }

    // Map course id -> course page URL
    const courseLinks = {
      cabling: 'course-cabling.html',
      networking: 'course-networking.html'
    };

    // Clear any placeholder content
    portsContainer.innerHTML = '';

    // Render each course as a port card
    courses.forEach(course => {
      const link = courseLinks[course.id];

      // Decide the status label + action button
      let statusHtml;
      let actionHtml = '';

      if (!user) {
        statusHtml = '<span class="status">● Access by invitation</span>';
      } else if (profile && profile.role === 'admin') {
        statusHtml = '<span class="status" style="color: var(--green);">● Staff access</span>';
        if (link) actionHtml = `<a class="btn btn-primary" href="instructor-dashboard.html">Open dashboard</a>`;
      } else if (profile && profile.role === 'instructor') {
        statusHtml = '<span class="status" style="color: var(--green);">● Instructor access</span>';
        if (link) actionHtml = `<a class="btn btn-primary" href="instructor-dashboard.html">Open dashboard</a>`;
      } else if (profile && !profile.approved) {
        statusHtml = '<span class="status">● Awaiting approval</span>';
      } else if (expiredCourses.has(course.id)) {
        statusHtml = '<span class="status" style="color: var(--copper-dark);">● Access expired</span>';
        if (link) actionHtml = `<a class="btn btn-ghost" href="student-dashboard.html">View dashboard</a>`;
      } else if (enrolledCourses.has(course.id)) {
        statusHtml = '<span class="status" style="color: var(--green);">● Enrolled</span>';
        if (link) actionHtml = `<a class="btn btn-primary" href="${link}">Continue course →</a>`;
      } else {
        statusHtml = '<span class="status" style="color: var(--copper-dark);">● Preview available</span>';
        // No per-card button: the two courses are already listed on this page.
      }

      const article = document.createElement('article');
      article.className = 'port';
      article.innerHTML = `
        <span class="port-num">PORT ${String(course.port_number).padStart(2, '0')}</span>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description)}</p>
        ${statusHtml}
        ${actionHtml ? `<div style="margin-top:1.1rem;">${actionHtml}</div>` : ''}
      `;
      portsContainer.appendChild(article);
    });

    // Append the practice quiz as a third card (PING 01) in the same
    // port style. Opens the Puter-hosted quiz full screen in a new tab.
    const quizUrl = window.PUTER_QUIZ_URL || '';
    const quizCard = document.createElement('article');
    quizCard.className = 'port';
    quizCard.innerHTML = `
      <span class="port-num">PING 01</span>
      <h3>Test your networking basics</h3>
      <p>Five quick multiple-choice questions to check your signal before you enroll. No account needed — your best score is saved on your device.</p>
      ${quizUrl
        ? '<span class="status">● Practice · open to all</span><div style="margin-top:1.1rem;"><a class="btn btn-ghost" href="' + quizUrl + '" target="_blank" rel="noopener">Take the quiz ↗</a></div>'
        : '<span class="status">● Being prepared — check back soon</span>'}
    `;
    portsContainer.appendChild(quizCard);

  } catch (err) {
    console.error('Exception loading courses:', err);
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

// Update the header nav for logged-in visitors
async function updateLandingNav() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, approved')
      .eq('id', session.user.id)
      .single();

    // Replace login links with a dashboard + logout
    const dashboardHref = (profile && (profile.role === 'admin' || profile.role === 'instructor'))
      ? 'instructor-dashboard.html'
      : 'student-dashboard.html';

    navActions.innerHTML = `
      <a href="${dashboardHref}">Dashboard</a>
      <span style="margin-left:1.4rem; font-family: var(--font-mono); font-size:0.82rem; color:var(--ink-soft);"></span>
      <a href="#" id="landingLogout" style="margin-left:1.4rem;">Log out</a>
    `;

    document.getElementById('landingLogout').addEventListener('click', async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });
  } catch (err) {
    console.log('Nav update skipped:', err);
  }
}

// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
  loadCoursesOnLanding();
  updateLandingNav();
});
