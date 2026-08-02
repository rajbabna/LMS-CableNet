// ===========================================================
// js/mentor-sessions.js
// Powers student-profile.html — the instructor's view of a single
// student's shared AI Mentor chat summaries. Requires an
// instructor/admin session.
//
// Query params: ?student_id=<uuid>&name=<encoded display name>
//
// Step 15 — AI Mentor chats (opt-in topic summaries only).
// ===========================================================

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('student_id') || '';
  const studentName = params.get('name') || 'this student';

  const el = {
    studentName: document.getElementById('studentName'),
    studentId: document.getElementById('studentId'),
    aiTimeline: document.getElementById('aiTimeline'),
    aiEmpty: document.getElementById('aiEmpty'),
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
    el.pageTitle = studentName + ' — AI Chats — Cable&Net Courses';
    document.title = el.pageTitle;
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
            <p style="margin:0 0 0.5rem;">${escapeHtml(chat.topic_summary)}</p>
            <span class="ai-count">${chat.message_count} ${chat.message_count === 1 ? 'message' : 'messages'}</span>
          </article>`;
      }).join('');
    } catch (err) {
      console.error('loadAiTimeline error:', err);
      el.aiTimeline.innerHTML = '<div class="empty-state">Could not load AI mentor chats.</div>';
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

    await loadAiTimeline();

    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
})();
