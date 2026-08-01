// ===========================================================
// js/mentor-sessions.js
// Powers student-profile.html — the instructor's mentor log for
// a single student. Requires an instructor/admin session.
//
// Query params: ?student_id=<uuid>&name=<encoded display name>
//
// Step 14 — Mentor Sessions. Instructor-only working notes.
// ===========================================================

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('student_id') || '';
  const studentName = params.get('name') || 'this student';

  let myCourses = [];
  let canLog = false;

  const el = {
    studentName: document.getElementById('studentName'),
    studentId: document.getElementById('studentId'),
    timeline: document.getElementById('mentorTimeline'),
    empty: document.getElementById('mentorEmpty'),
    logForm: document.getElementById('logSessionForm'),
    courseSelect: document.getElementById('sessionCourse'),
    dateInput: document.getElementById('sessionDate'),
    topicInput: document.getElementById('sessionTopic'),
    notesInput: document.getElementById('sessionNotes'),
    outcomeInput: document.getElementById('sessionOutcome'),
    followUpInput: document.getElementById('sessionFollowUp'),
    logSection: document.getElementById('logSessionSection'),
    alert: document.getElementById('alert'),
    pageTitle: document.title
  };

  // ============================================
  // Auth + role guard
  // ============================================
  async function guard() {
    if (!studentId) {
      showAlert('Missing student. Returning to dashboard...', 'error');
      setTimeout(() => { window.location.href = 'instructor-dashboard.html'; }, 1800);
      return false;
    }

    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    if (authError || !session) {
      window.location.href = 'login.html';
      return false;
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, approved, full_name, email')
      .eq('id', session.user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
      window.location.href = 'student-dashboard.html';
      return false;
    }
    if (!profile.approved) {
      window.location.href = 'index.html';
      return false;
    }

    canLog = true;
    document.getElementById('profileName').textContent = profile.full_name || profile.email;
    document.getElementById('profileRole').textContent = profile.role === 'admin' ? 'Admin' : 'Instructor';
    document.getElementById('profileRole').className = 'role-badge role-badge--' + profile.role;
    document.getElementById('profileRole').style.display = '';

    return true;
  }

  // ============================================
  // Header
  // ============================================
  function setHeader() {
    el.studentName.textContent = studentName;
    el.studentId.textContent = 'Student ' + studentId.slice(0, 8).toUpperCase();
    el.pageTitle = studentName + ' — Mentor Log — Cable&Net Courses';
    document.title = el.pageTitle;
  }

  // ============================================
  // Load courses for the form select
  // ============================================
  async function loadMyCourses() {
    try {
      const { data, error } = await supabaseClient.rpc('get_my_courses');
      if (error) throw error;
      myCourses = data || [];
      el.courseSelect.innerHTML = '<option value="">— Not course-specific —</option>' +
        myCourses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
    } catch (err) {
      console.error('loadMyCourses error:', err);
    }
  }

  // ============================================
  // Timeline
  // ============================================
  async function loadTimeline() {
    el.timeline.innerHTML = '<div class="empty-state"><span class="spinner"></span> Loading mentor sessions...</div>';
    el.empty.style.display = 'none';

    try {
      const { data, error } = await supabaseClient.rpc('get_mentor_sessions_for_student', {
        p_student_id: studentId
      });

      if (error) throw error;

      const sessions = data || [];
      if (sessions.length === 0) {
        el.timeline.innerHTML = '';
        el.empty.style.display = 'block';
        return;
      }

      el.timeline.innerHTML = sessions.map((s, i) => {
        const dateStr = new Date(s.session_date + 'T00:00:00').toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric'
        });
        const createdStr = s.created_at ? new Date(s.created_at).toLocaleString() : '';

        let followUpHtml = '';
        if (s.follow_up) {
          if (s.follow_up_status === 'open') {
            followUpHtml = `
              <div class="mentor-followup open">
                <strong>Follow-up (open):</strong> ${escapeHtml(s.follow_up)}
                <button class="btn btn-table btn-status" data-resolve="${s.id}" style="margin-left:0.6rem;">Mark resolved</button>
              </div>`;
          } else {
            followUpHtml = `
              <div class="mentor-followup resolved">
                <strong>Follow-up (resolved ${s.resolved_at ? new Date(s.resolved_at).toLocaleDateString() : ''}):</strong> ${escapeHtml(s.follow_up)}
              </div>`;
          }
        }

        return `
          <article class="mentor-entry" data-entry="${i}">
            <div class="mentor-entry-head">
              <span class="port-num">SESSION</span>
              ${s.course_title ? `<span class="mentor-course">${escapeHtml(s.course_title)}</span>` : ''}
              <span class="mentor-date">${dateStr}</span>
            </div>
            <h3>${escapeHtml(s.topic)}</h3>
            <p class="mentor-meta">
              with ${escapeHtml(s.instructor_name)}
              ${createdStr ? ' · logged ' + createdStr : ''}
            </p>
            ${s.notes ? `<p><strong>Notes:</strong> ${escapeHtml(s.notes)}</p>` : ''}
            ${s.outcome ? `<p><strong>Outcome:</strong> ${escapeHtml(s.outcome)}</p>` : ''}
            ${followUpHtml}
          </article>`;
      }).join('');

      // Wire up resolve buttons
      el.timeline.querySelectorAll('[data-resolve]').forEach(btn => {
        btn.addEventListener('click', () => resolveFollowUp(btn.getAttribute('data-resolve'), btn));
      });

    } catch (err) {
      console.error('loadTimeline error:', err);
      el.timeline.innerHTML = '<div class="empty-state">Could not load mentor sessions.</div>';
    }
  }

  async function resolveFollowUp(sessionId, btn) {
    btn.disabled = true;
    try {
      const { data, error } = await supabaseClient.rpc('resolve_mentor_followup', {
        p_session_id: sessionId
      });
      if (error) throw error;
      if (data === 'not_found') {
        showAlert('Session not found or you do not have permission to resolve it.', 'error');
        btn.disabled = false;
        return;
      }
      showAlert('✓ Follow-up marked resolved', 'success');
      await loadTimeline();
    } catch (err) {
      console.error('resolveFollowUp error:', err);
      showAlert('Could not resolve follow-up.', 'error');
      btn.disabled = false;
    }
  }

  // ============================================
  // Log a session
  // ============================================
  async function submitSession(e) {
    e.preventDefault();

    const topic = el.topicInput.value.trim();
    if (!topic) {
      showAlert('Topic is required.', 'error');
      return;
    }

    try {
      const { data, error } = await supabaseClient.rpc('log_mentor_session', {
        p_student_id: studentId,
        p_course_id: el.courseSelect.value || null,
        p_session_date: el.dateInput.value || null,
        p_topic: topic,
        p_notes: el.notesInput.value.trim() || null,
        p_outcome: el.outcomeInput.value.trim() || null,
        p_follow_up: el.followUpInput.value.trim() || null
      });

      if (error) throw error;

      if (data === 'not_authorized') {
        showAlert('You are not authorized to log mentor sessions.', 'error');
        return;
      }
      if (data === 'student_not_found') {
        showAlert('Student not found.', 'error');
        return;
      }
      if (data === 'bad_input') {
        showAlert('Please fill in the topic.', 'error');
        return;
      }

      showAlert('✓ Mentor session logged', 'success');
      el.logForm.reset();
      el.dateInput.value = new Date().toISOString().slice(0, 10);
      await loadTimeline();
    } catch (err) {
      console.error('submitSession error:', err);
      showAlert('Could not save the session. Check your connection and try again.', 'error');
    }
  }

  // ============================================
  // Utility
  // ============================================
  function escapeHtml(text) {
    const map = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#039;'
    };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  function showAlert(message, type = 'info') {
    el.alert.textContent = message;
    el.alert.className = 'alert-msg show alert-' + type;
    if (type === 'success') {
      setTimeout(() => el.alert.classList.remove('show'), 4000);
    }
  }

  async function handleLogout() {
    try {
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    } catch (err) {
      showAlert('Error logging out: ' + err.message, 'error');
    }
  }

  // ============================================
  // Init
  // ============================================
  document.addEventListener('DOMContentLoaded', async () => {
    setHeader();

    const ok = await guard();
    if (!ok) return;

    // Default the date field to today
    el.dateInput.value = new Date().toISOString().slice(0, 10);

    await loadMyCourses();
    await loadTimeline();

    el.logForm.addEventListener('submit', submitSession);
    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
})();
