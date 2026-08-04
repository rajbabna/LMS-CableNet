// ===========================================================
// js/mentor-sessions.js
// Powers student-profile.html — the instructor's view of a single
// student's mentor activity:
//   1. Human-logged mentor sessions (log form + timeline +
//      follow-up resolve)  -> mentor_sessions table
//   2. Shared AI Mentor chat summaries -> mentor_ai_sessions
//   3. AI Mentor escalation flags (open/resolved/dismissed)
// Requires an instructor/admin session.
//
// Query params: ?student_id=<uuid>&name=<encoded display name>
//
// Step 14 (mentor sessions) + Step 15 (AI chat summaries) +
// Step 16 (escalation flags).
// ===========================================================

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('student_id') || '';
  const studentName = params.get('name') || 'this student';

  const el = {
    studentName: document.getElementById('studentName'),
    studentId: document.getElementById('studentId'),
    mentorTimeline: document.getElementById('mentorTimeline'),
    mentorEmpty: document.getElementById('mentorEmpty'),
    aiTimeline: document.getElementById('aiTimeline'),
    aiEmpty: document.getElementById('aiEmpty'),
    flagTimeline: document.getElementById('flagTimeline'),
    flagEmpty: document.getElementById('flagEmpty'),
    alert: document.getElementById('alert')
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
    document.title = studentName + ' — Student Profile — Cable&Net Courses';
  }

  // ============================================
  // Course dropdown for the log form (my courses)
  // ============================================
  async function loadCourses() {
    const select = document.getElementById('sessionCourse');
    try {
      const { data, error } = await supabaseClient.rpc('get_my_courses');
      if (error) throw error;
      const courses = data || [];
      select.innerHTML = '<option value="">— General —</option>' +
        courses
          .map(c => `<option value="${c.course_id || c.id}">${c.title}</option>`)
          .join('');
    } catch (err) {
      console.error('loadCourses error:', err);
      select.innerHTML = '<option value="">— General —</option>';
    }
  }

  // ============================================
  // Human mentor sessions timeline
  // ============================================
  async function loadMentorTimeline() {
    el.mentorTimeline.innerHTML = '<div class="empty-state"><span class="spinner"></span> Loading mentor sessions...</div>';
    el.mentorEmpty.style.display = 'none';

    try {
      const { data, error } = await supabaseClient.rpc('get_mentor_sessions_for_student', {
        p_student_id: studentId
      });

      if (error) throw error;

      const sessions = data || [];
      if (sessions.length === 0) {
        el.mentorTimeline.innerHTML = '';
        el.mentorEmpty.style.display = 'block';
        return;
      }

      el.mentorTimeline.innerHTML = sessions.map(s => {
        const followUpHtml = s.follow_up
          ? `
            <p style="margin:0.6rem 0 0;">
              <span class="follow-up-badge ${s.follow_up_status === 'resolved' ? 'resolved' : 'open'}">
                ${s.follow_up_status === 'resolved' ? '✓ resolved' : 'OPEN follow-up'}
              </span>
              <span style="font-size:0.9rem; color: var(--ink);">${escapeHtml(s.follow_up)}</span>
              ${s.follow_up_status !== 'resolved'
                ? `<button class="btn-resolve" style="margin-left:0.6rem;"
                    onclick="resolveFollowUp('${s.id}')">Resolve</button>`
                : ''}
            </p>`
          : '';

        return `
          <article class="mentor-entry">
            <div class="mentor-entry-head">
              <span class="port-num">SESSION</span>
              ${s.course_title ? `<span class="mentor-course">${escapeHtml(s.course_title)}</span>` : ''}
              <span class="mentor-date">${new Date(s.session_date + 'T00:00:00').toLocaleDateString()}</span>
            </div>
            <h3>${escapeHtml(s.topic)}</h3>
            <p style="color: var(--ink-soft); font-size:0.78rem; margin:0 0 0.4rem;">
              Logged by ${escapeHtml(s.instructor_name)}
            </p>
            ${s.notes ? `<p>${escapeHtml(s.notes)}</p>` : ''}
            ${s.outcome ? `<p style="color: var(--ink);"><strong>Outcome:</strong> ${escapeHtml(s.outcome)}</p>` : ''}
            ${followUpHtml}
          </article>`;
      }).join('');
    } catch (err) {
      console.error('loadMentorTimeline error:', err);
      el.mentorTimeline.innerHTML = '<div class="empty-state">Could not load mentor sessions.</div>';
    }
  }

  // ============================================
  // Log a mentor session
  // ============================================
  async function logSession(e) {
    e.preventDefault();
    const topic = document.getElementById('sessionTopic').value.trim();
    if (!topic) { showAlert('Topic is required.', 'error'); return; }

    const course   = document.getElementById('sessionCourse').value;
    const when     = document.getElementById('sessionDate').value || null;
    const notes    = document.getElementById('sessionNotes').value.trim() || null;
    const outcome  = document.getElementById('sessionOutcome').value.trim() || null;
    const followUp = document.getElementById('sessionFollowUp').value.trim() || null;

    try {
      const { data, error } = await supabaseClient.rpc('log_mentor_session', {
        p_student_id:   studentId,
        p_topic:        topic,
        p_course_id:    course || null,
        p_session_date: when,
        p_notes:        notes,
        p_outcome:      outcome,
        p_follow_up:    followUp
      });

      if (error) throw error;
      if (data === 'not_authorized') { showAlert('Not authorized to log sessions.', 'error'); return; }
      if (data === 'bad_input') { showAlert('Topic is required.', 'error'); return; }
      if (data === 'student_not_found') { showAlert('Student not found.', 'error'); return; }

      showAlert('✓ Session logged', 'success');
      document.getElementById('logSessionForm').reset();
      document.getElementById('sessionDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('sessionTopic').focus();
      await loadMentorTimeline();
    } catch (err) {
      console.error('logSession error:', err);
      showAlert('Could not log session: ' + err.message, 'error');
    }
  }

  // ============================================
  // Resolve an open follow-up
  // ============================================
  async function resolveFollowUp(sessionId) {
    try {
      const { data, error } = await supabaseClient.rpc('resolve_mentor_followup', {
        p_session_id: sessionId
      });
      if (error) throw error;
      if (data === 'not_found') { showAlert('Session not found or not yours to resolve.', 'error'); return; }
      showAlert('✓ Follow-up resolved', 'success');
      await loadMentorTimeline();
    } catch (err) {
      console.error('resolveFollowUp error:', err);
      showAlert('Could not resolve follow-up.', 'error');
    }
  }

  // ============================================
  // AI Mentor chats timeline
  // ============================================
  async function loadAiTimeline() {
    el.aiTimeline.innerHTML = '<div class="empty-state"><span class="spinner"></span> Loading AI mentor chats...</div>';
    el.aiEmpty.style.display = 'none';

    try {
      const { data, error } = await supabaseClient.rpc('get_ai_mentor_sessions_for_student', {
        p_student_id: studentId
      });

      if (error) throw error;

      const chats = data || [];
      if (chats.length === 0) {
        el.aiTimeline.innerHTML = '';
        el.aiEmpty.style.display = 'block';
        return;
      }

      el.aiTimeline.innerHTML = chats.map(chat => {
        const when = new Date(chat.updated_at || chat.started_at).toLocaleString();
        return `
          <article class="mentor-entry ai-entry">
            <div class="mentor-entry-head">
              <span class="port-num">AI CHAT</span>
              ${chat.course_title ? `<span class="mentor-course">${escapeHtml(chat.course_title)}</span>` : ''}
              <span class="mentor-date">${when}</span>
            </div>
            <p style="margin:0 0 0.5rem;">${chat.topic_summary
              ? escapeHtml(chat.topic_summary)
              : '<em style="color:var(--ink-soft);">Used the AI mentor — no summary shared.</em>'}</p>
            <span class="ai-count">${chat.message_count} ${chat.message_count === 1 ? 'message' : 'messages'}</span>
          </article>`;
      }).join('');
    } catch (err) {
      console.error('loadAiTimeline error:', err);
      el.aiTimeline.innerHTML = '<div class="empty-state">Could not load AI mentor chats.</div>';
    }
  }

  // ============================================
  // AI Mentor escalation flags
  // ============================================
  async function loadFlags() {
    el.flagTimeline.innerHTML = '<div class="empty-state"><span class="spinner"></span> Loading flagged topics...</div>';
    el.flagEmpty.style.display = 'none';

    try {
      const { data, error } = await supabaseClient.rpc('get_ai_mentor_flags_for_student', {
        p_student_id: studentId
      });

      if (error) throw error;

      const flags = data || [];
      if (flags.length === 0) {
        el.flagTimeline.innerHTML = '';
        el.flagEmpty.style.display = 'block';
        return;
      }

      const statusLabel = { open: 'OPEN', resolved: '✓ resolved', dismissed: 'dismissed' };

      el.flagTimeline.innerHTML = flags.map(f => {
        const when = new Date(f.created_at).toLocaleString();
        const actions = f.status === 'open'
          ? `<button class="btn-resolve" onclick="resolveFlag('${f.id}')">Resolve</button>` +
            `<button class="btn-dismiss" onclick="dismissFlag('${f.id}')">Dismiss</button>`
          : '';
        return `
          <article class="mentor-entry">
            <div class="mentor-entry-head">
              <span class="flag-badge ${f.status}">${statusLabel[f.status] || f.status}</span>
              ${f.course_title ? `<span class="mentor-course">${escapeHtml(f.course_title)}</span>` : ''}
              <span class="mentor-date">${when}</span>
            </div>
            <h3>${escapeHtml(f.topic)}</h3>
            ${f.module_id ? `<p style="color: var(--ink-soft); font-size:0.78rem; margin:0 0 0.4rem;">Module ${escapeHtml(f.module_id)}</p>` : ''}
            ${f.reason ? `<p>${escapeHtml(f.reason)}</p>` : ''}
            ${actions ? `<p style="margin:0.7rem 0 0;">${actions}</p>` : ''}
          </article>`;
      }).join('');
    } catch (err) {
      console.error('loadFlags error:', err);
      el.flagTimeline.innerHTML = '<div class="empty-state">Could not load flagged topics.</div>';
    }
  }

  async function setFlagStatus(flagId, rpc, label) {
    try {
      const { data, error } = await supabaseClient.rpc(rpc, { p_flag_id: flagId });
      if (error) throw error;
      if (data === 'not_authorized') { showAlert('Not authorized to update flags.', 'error'); return; }
      if (data === 'not_found') { showAlert('Flag not found or already handled.', 'error'); return; }
      showAlert('✓ Flag ' + label, 'success');
      await loadFlags();
    } catch (err) {
      console.error('setFlagStatus error:', err);
      showAlert('Could not update flag.', 'error');
    }
  }

  function resolveFlag(flagId) {
    setFlagStatus(flagId, 'resolve_ai_mentor_flag', 'resolved');
  }

  function dismissFlag(flagId) {
    setFlagStatus(flagId, 'dismiss_ai_mentor_flag', 'dismissed');
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

    document.getElementById('sessionDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('logSessionForm').addEventListener('submit', logSession);

    window.resolveFollowUp = resolveFollowUp;
    window.resolveFlag = resolveFlag;
    window.dismissFlag = dismissFlag;

    await Promise.all([
      loadCourses(),
      loadMentorTimeline(),
      loadAiTimeline(),
      loadFlags()
    ]);

    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
})();