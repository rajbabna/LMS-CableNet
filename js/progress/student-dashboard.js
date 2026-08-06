// ===========================================================
// Student Dashboard
// Fetches enrolled courses and renders progress cards
// ===========================================================

class StudentDashboard {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentUser = null;
    this.courses = [];
    this._refreshTimer = null; // debounce timer for visibility refreshes
    this._refreshing = false;  // guard against overlapping refreshes
    this.init();
  }

  async init() {
    try {
      // Get current authenticated user
      const { data: { session } } = await this.supabase.auth.getSession();

      if (!session) {
        window.location.href = "login.html";
        return;
      }

      this.currentUser = session.user;

      // Verify user is approved
      const { data: profile, error: profileError } = await this.supabase
        .from("profiles")
        .select("approved, full_name")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        window.location.href = "login.html";
        return;
      }

      if (!profile.approved) {
        window.location.href = "index.html";
        return;
      }

      // Update user name in header
      document.querySelectorAll("[data-user-name]").forEach(el => {
        el.textContent = profile.full_name || session.user.email;
      });

      // Fetch course progress data
      await this.fetchCourses();

      // Fetch how many quizzes the student has passed (best_score >= 70).
      await this.loadQuizStats();

      // Fetch per-unit breakdown for enrolled courses (sql/45).
      await this.loadUnitBreakdown();

      // Render the dashboard
      this.renderDashboard();

      // Load achievements gallery (best effort)
      await this.loadAchievements();

      // Bind logout button
      this.bindLogout();

      // Silently re-fetch when the student returns to this tab, so progress
      // made elsewhere (e.g. a module reset on the course page) is reflected.
      this.bindVisibilityRefresh();

    } catch (error) {
      console.error("Dashboard init error:", error);
      this.showError("Failed to load dashboard. Please refresh.");
    }
  }

  async fetchCourses() {
    try {
      // Fetch ALL courses (so students can preview unenrolled ones)
      const { data: allCourses, error: coursesError } = await this.supabase
        .from("courses")
        .select("id, title, description, port_number")
        .order("port_number", { ascending: true });

      if (coursesError) {
        console.error("Fetch courses error:", coursesError);
        throw coursesError;
      }

      // Fetch this student's enrollments (incl. expiry)
      const { data: enrollments } = await this.supabase
        .from("enrollments")
        .select("course_id, expires_at")
        .eq("user_id", this.currentUser.id);

      const now = Date.now();
      const enrolledMap = {};
      (enrollments || []).forEach(e => {
        enrolledMap[e.course_id] = {
          is_expired: !!(e.expires_at && new Date(e.expires_at).getTime() <= now),
          expires_at: e.expires_at
        };
      });
      const enrolledSet = new Set(Object.keys(enrolledMap));

      // Fetch progress rows (enrolled courses only)
      const { data: progressRows } = await this.supabase
        .from("course_progress_view")
        .select("*")
        .eq("user_id", this.currentUser.id);

      const progressByCourse = {};
      (progressRows || []).forEach(row => {
        progressByCourse[row.course_id] = row;
      });

      // Merge: every course gets a card; enrolled ones carry progress data
      this.courses = (allCourses || []).map(course => {
        const progress = progressByCourse[course.id];
        const enrollment = enrolledMap[course.id] || null;
        return {
          course_id: course.id,
          course_title: course.title,
          description: course.description,
          port_number: course.port_number,
          is_enrolled: enrolledSet.has(course.id),
          is_expired: enrollment ? enrollment.is_expired : false,
          expires_at: enrollment ? enrollment.expires_at : null,
          total_modules: progress ? progress.total_modules : 0,
          completed_modules: progress ? progress.completed_modules : 0,
          progress_percentage: progress ? progress.progress_percentage : 0,
          status: progress ? progress.status : null,
          enrolled_at: progress ? progress.enrolled_at : null,
          completed_at: progress ? progress.completed_at : null
        };
      });
    } catch (error) {
      console.error("Error fetching courses:", error);
      this.courses = [];
    }
  }

  async loadQuizStats() {
    this.quizPassed = 0;
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session) return;
      const { data } = await this.supabase
        .from("quiz_scores")
        .select("best_score")
        .eq("user_id", session.user.id);
      this.quizPassed = (data || []).filter(q => (q.best_score || 0) >= 70).length;
    } catch (err) {
      console.error("Quiz stats load error:", err);
    }
  }

  async loadUnitBreakdown() {
    this.unitData = {};
    try {
      // Load the unit breakdown for every course (enrolled AND preview),
      // so unregistered cards also show the curriculum structure.
      const courseIds = this.courses.map(c => c.course_id);
      if (courseIds.length === 0) return;

      const [unitsRes, modulesRes, completionsRes] = await Promise.all([
        this.supabase.from("units").select("id, course_id, unit_number, title, sort_order")
          .in("course_id", courseIds)
          .order("sort_order", { ascending: true }).order("unit_number", { ascending: true }),
        this.supabase.from("modules").select("id, course_id, unit_id")
          .in("course_id", courseIds),
        this.supabase.from("module_completions")
          .select("module_id")
          .eq("user_id", this.currentUser.id)
          .eq("status", "completed")
      ]);

      const completed = new Set((completionsRes.data || []).map(c => c.module_id));
      const units = unitsRes.data || [];
      const modules = modulesRes.data || [];

      // Prepend a unit title suffix for id uniqueness? No — group by course.
      const byCourse = {};
      units.forEach(u => {
        if (!byCourse[u.course_id]) byCourse[u.course_id] = [];
        byCourse[u.course_id].push({
          id: u.id, number: u.unit_number, title: u.title,
          total: 0, done: 0
        });
      });

      modules.forEach(m => {
        let unit = (byCourse[m.course_id] || []).find(u => u.id === m.unit_id);
        if (!unit) return; // orphan modules don't appear on the card
        unit.total += 1;
        if (completed.has(String(m.id)) || completed.has(m.id)) unit.done += 1;
      });

      this.unitData = byCourse;
    } catch (err) {
      console.error("Unit breakdown load error:", err);
    }
  }

  renderDashboard() {
    const grid = document.getElementById("coursesGrid");

    if (!grid) {
      console.error("No .courses-grid found");
      return;
    }

    // Clear loading state
    grid.innerHTML = "";

    // Show empty state if no courses
    if (this.courses.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h2>No courses yet</h2>
          <p>You're not enrolled in any courses. Check back soon or contact your instructor.</p>
        </div>
      `;
      return;
    }

    // Quick stats strip (replaces the overall-progress summary card)
    const active = this.courses.filter(c => c.is_enrolled && !c.is_expired);
    if (active.length > 0) {
      const done = active.reduce((s, c) => s + (c.completed_modules || 0), 0);
      const total = active.reduce((s, c) => s + (c.total_modules || 0), 0);
      const certificates = active.filter(c => (c.progress_percentage || 0) >= 100).length;
      const allLifetime = active.every(c => !c.expires_at);
      const nearestExpiry = active
        .filter(c => c.expires_at)
        .map(c => new Date(c.expires_at).getTime())
        .sort((a, b) => a - b)[0];
      const hasDeadline = !allLifetime && !!nearestExpiry;
      const accessNum = hasDeadline ? Math.ceil((nearestExpiry - Date.now()) / 86400000) : '∞';
      const accessLabel = hasDeadline ? 'days left' : 'lifetime access';

      const strip = document.createElement("div");
      strip.className = "stat-strip";
      strip.innerHTML = `
        <div class="stat-tile"><span class="stat-num">${done}</span><span class="stat-label">Modules complete</span></div>
        <div class="stat-tile"><span class="stat-num">${this.quizPassed || 0}</span><span class="stat-label">Quizzes passed</span></div>
        <div class="stat-tile"><span class="stat-num">${certificates}</span><span class="stat-label">Certificates</span></div>
        <div class="stat-tile"><span class="stat-num">${accessNum}</span><span class="stat-label">${accessLabel}</span></div>
      `;
      grid.appendChild(strip);

      // Hero donut + Resume (left = overall %).
      const overall = total ? Math.round((done / total) * 100) : 0;
      this.renderHeroStats(active, overall, done, total);
    }

    // Render each course card
    this.courses.forEach(course => {
      const card = this.createCourseCard(course);
      grid.appendChild(card);
    });
  }

  renderHeroStats(active, overall, done, total) {
    const right = document.getElementById("heroRight");
    const listEl = document.getElementById("heroResumeList");
    if (!right || !listEl) return;
    const donut = document.getElementById("heroDonut");
    const pctEl = document.getElementById("heroDonutPct");
    if (donut && pctEl) {
      donut.style.setProperty("--p", overall + "%");
      pctEl.textContent = overall + "%";
    }
    // One resume button per active course, so it works for students
    // enrolled in several ports at once. The donut still shows overall %.
    const courses = (active || []).slice();
    if (courses.length === 0) {
      // Not enrolled yet: keep the donut visible (0%) with a locked action.
      if (donut && pctEl) {
        donut.style.setProperty("--p", "0%");
        pctEl.textContent = "0%";
      }
      listEl.innerHTML = '<span class="btn hero-resume locked" aria-disabled="true">Enrollment required</span>';
      right.hidden = false;
      return;
    }
    listEl.innerHTML = courses.map(c => {
      const complete = (c.total_modules || 0) > 0 && (c.completed_modules || 0) >= (c.total_modules || 0);
      const short = "PORT " + String(c.port_number || 0).padStart(2, "0");
      const link = "course.html?course=" + encodeURIComponent(c.course_id);
      const portClass = c.port_number === 2 ? "port-02" : "port-01";
      return `<a class="btn btn-primary hero-resume ${portClass}" href="${link}">${complete ? "Review · " : "Resume · "}${short}</a>`;
    }).join("");
    right.hidden = false;
  }

  unitStripHtml(course) {
    const units = (this.unitData || {})[course.course_id] || [];
    if (units.length === 0) return "";
    const rows = units.slice(0, 4).map(u => {
      const pct = u.total ? Math.round((u.done / u.total) * 100) : 0;
      return `
        <div class="unit-strip-row">
          <span class="unit-strip-label" title="${this.escapeHtml(u.title)}">UNIT ${String(u.number).padStart(2, '0')}</span>
          <span class="unit-strip-count">${u.done}/${u.total}</span>
        </div>
        <div class="unit-strip-bar"><span style="width:${pct}%"></span></div>`;
    }).join("");
    const more = units.length > 4
      ? `<div class="unit-strip-more">+ ${units.length - 4} more unit${units.length - 4 === 1 ? '' : 's'}</div>`
      : "";
    return `<div class="unit-strip">${rows}${more}</div>`;
  }

  createCourseCard(course) {
    const card = document.createElement("div");
    const portClass = "port-" + String(course.port_number || 0).padStart(2, '0');
    card.className = "course-card " + portClass;
    if (!course.is_enrolled || course.is_expired) {
      card.classList.add("course-preview");
    }

    // Calculate progress
    const progressPercent = course.progress_percentage || 0;
    const completedModules = course.completed_modules || 0;
    const totalModules = course.total_modules || 0;

    // Determine status and badge styling
    let statusLabel = "○ Not Started";
    let statusClass = "not-started";

    if (course.is_enrolled && course.is_expired) {
      statusLabel = "⏰ Access expired";
      statusClass = "expired";
    } else if (course.is_enrolled) {
      if (progressPercent === 100) {
        statusLabel = "✓ Completed";
        statusClass = "completed";
      } else if (progressPercent > 0) {
        statusLabel = "⟳ In Progress";
        statusClass = "in-progress";
      }
    } else {
      statusLabel = "👁 Preview only";
      statusClass = "preview";
    }

    // Format enrollment date
    const enrolledDate = course.is_enrolled ? this.formatDate(course.enrolled_at) : "Not enrolled";

    // Access line — every enrolled card shows exactly one row so the
    // two cards stay aligned: a real expiry, or lifetime access.
    // The text always reflects the student's status (remaining time +
    // course progress).
    let accessLine = "";
    if (course.is_enrolled) {
      if (course.expires_at) {
        if (course.is_expired) {
          accessLine = `<span class="expiry expired">Expired ${this.formatDate(course.expires_at)}</span>`;
        } else {
          const daysLeft = Math.ceil((new Date(course.expires_at).getTime() - Date.now()) / 86400000);
          const near = daysLeft <= 14;
          const progressNote = progressPercent === 100
            ? "complete"
            : (progressPercent === 0 ? "not started" : progressPercent + "% complete");
          accessLine = near
            ? `<span class="expiry warning">⏳ ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining · ${progressNote}</span>`
            : `<span class="expiry">Access until ${this.formatDate(course.expires_at)}</span>`;
        }
      } else {
        accessLine = `<span class="expiry lifetime">✓ Lifetime access</span>`;
      }
    } else {
      accessLine = `<span class="expiry preview">Register to track your records</span>`;
    }

    // Determine course link (data-driven course dashboard)
    const courseLink = "course.html?course=" + encodeURIComponent(course.course_id);

    // Build card HTML
    card.innerHTML = `
      <div class="port-num ${portClass}">PORT ${String(course.port_number).padStart(2, '0')}</div>

      <h3>${this.escapeHtml(course.course_title)}</h3>
      ${course.description ? `<p class="course-desc">${this.escapeHtml(course.description)}</p>` : ''}

<div class="progress-section">
          <div class="progress-label">
            <span>${completedModules} of ${totalModules} modules complete</span>
            <span class="progress-percentage ${course.is_enrolled && !course.is_expired && progressPercent === 100 ? 'complete' : (course.is_enrolled && !course.is_expired && progressPercent === 0 ? 'muted' : '')}">${course.is_enrolled && !course.is_expired ? (progressPercent === 100 ? '✓ Complete' : (progressPercent === 0 ? 'Not started' : progressPercent + '%')) : '—'}</span>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width: ${course.is_enrolled && !course.is_expired ? progressPercent : 0}%"></div>
          </div>
        </div>

      ${this.unitStripHtml(course)}

      <div class="course-status ${statusClass}">
        ${statusLabel}
      </div>

      <div class="enrollment-date">
        ${course.is_enrolled ? `<span class="enr-label">Enrolled ·</span> ${enrolledDate}` : 'Not enrolled'}
      </div>

      ${accessLine}

      <div class="course-actions">
        <a href="${courseLink}" class="btn-continue">
          ${course.is_enrolled && !course.is_expired ? 'Continue Course →' : 'Preview Course →'}
        </a>
      </div>
    `;

    return card;
  }

  async loadAchievements() {
    const box = document.getElementById("achievementsGrid");
    if (!box) return;

    try {
      const { data, error } = await this.supabase.rpc("evaluate_achievements");
      if (error) throw error;

      const items = data || [];
      if (items.length === 0) {
        box.innerHTML = '<div class="empty-state">No achievements available yet.</div>';
        return;
      }

      const earnedCount = items.filter(i => i.earned).length;

      // Hero motivation callout
      const motivate = document.getElementById("heroMotivate");
      const earnedEl = document.getElementById("motivateEarned");
      const totalEl = document.getElementById("motivateTotalLabel");
      if (motivate && earnedEl && totalEl) {
        earnedEl.textContent = earnedCount;
        totalEl.textContent = "of " + items.length + " badges";
        motivate.hidden = false;
      }

      box.innerHTML = `
        <div style="grid-column:1/-1; font-size:0.9rem; color:var(--ink-soft); margin-bottom:0.2rem;">
          ${earnedCount} of ${items.length} badges earned
        </div>
        ${items.map(a => `
          <div class="achievement-badge ${a.earned ? 'earned' : 'locked'}">
            <span class="a-icon">${this.escapeHtml(a.icon)}</span>
            <h3>${this.escapeHtml(a.title)}</h3>
            <p>${this.escapeHtml(a.description)}</p>
            ${a.earned
              ? `<div class="badge-earned-label">✓ Earned</div>`
              : ''}
          </div>`).join('')}`;
    } catch (err) {
      console.error("loadAchievements error:", err);
      box.innerHTML = '<div class="empty-state">Achievements unavailable.</div>';
    }
  }

  formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  // When the student is previewing/resetting in another tab, the already-open
  // dashboard would otherwise show stale numbers until a manual refresh. This
  // re-fetches course progress whenever the tab becomes visible again, then
  // re-renders. Debounced + guarded so a burst of tab flips or overlapping
  // refreshes never hammer Supabase or blank the page.
  bindVisibilityRefresh() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;

      if (this._refreshTimer) clearTimeout(this._refreshTimer);
      this._refreshTimer = setTimeout(() => this.refreshProgress(), 350);
    });
  }

  async refreshProgress() {
    if (this._refreshing) return;

    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) return;

    this._refreshing = true;
    try {
      await this.fetchCourses();
      await this.loadQuizStats();
      await this.loadUnitBreakdown();
      // Only re-render if the user is still looking at the tab.
      if (document.visibilityState === "visible") this.renderDashboard();
    } catch (err) {
      // Quiet failure: keep the existing data on screen rather than disturbing
      // the page. A transient network blip can be resolved by a manual refresh.
      console.warn("Background progress refresh failed:", err);
    } finally {
      this._refreshing = false;
    }
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  showError(message) {
    const grid = document.getElementById("coursesGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state">
          <h2>Error</h2>
          <p>${this.escapeHtml(message)}</p>
        </div>
      `;
    }
  }

  bindLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.supabase.auth.signOut();
        window.location.href = "login.html";
      });
    }
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (typeof supabaseClient !== "undefined") {
    new StudentDashboard(supabaseClient);
  } else {
    console.error("supabaseClient not found. Check that js/supabase-client.js is loaded.");
  }
});
