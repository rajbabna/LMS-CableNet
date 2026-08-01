// ===========================================================
// Student Dashboard
// Fetches enrolled courses and renders progress cards
// ===========================================================

class StudentDashboard {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentUser = null;
    this.courses = [];
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

      // Render the dashboard
      this.renderDashboard();

      // Bind logout button
      this.bindLogout();

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

    // Render each course card
    this.courses.forEach(course => {
      const card = this.createCourseCard(course);
      grid.appendChild(card);
    });
  }

  createCourseCard(course) {
    const card = document.createElement("div");
    card.className = "course-card";
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

    // Expiry line (enrolled but limited-time)
    let expiryLine = "";
    if (course.is_enrolled && course.expires_at) {
      if (course.is_expired) {
        expiryLine = `<span class="expiry expired">Expired ${this.formatDate(course.expires_at)}</span>`;
      } else {
        expiryLine = `<span class="expiry">Access until ${this.formatDate(course.expires_at)}</span>`;
      }
    }

    // Determine course link based on course_id
    const courseLinks = {
      cabling: "course-cabling.html",
      networking: "course-networking.html"
    };
    const courseLink = courseLinks[course.course_id] || "#";

    // Build card HTML
    card.innerHTML = `
      <div class="port-num">Port ${course.port_number}</div>
      
      <h3>${this.escapeHtml(course.course_title)}</h3>
      ${course.description ? `<p class="course-desc">${this.escapeHtml(course.description)}</p>` : ''}
      
      <div class="progress-section">
        <div class="progress-label">
          <span>${completedModules} of ${totalModules} modules complete</span>
          <span class="progress-percentage">${course.is_enrolled && !course.is_expired ? progressPercent + '%' : '—'}</span>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${course.is_enrolled && !course.is_expired ? progressPercent : 0}%"></div>
        </div>
      </div>

      <div class="enrollment-date">
        ${enrolledDate}
      </div>

      ${expiryLine}

      <div class="course-status ${statusClass}">
        ${statusLabel}
      </div>

      <div class="course-actions">
        <a href="${courseLink}" class="btn-continue">
          ${course.is_enrolled && !course.is_expired ? 'Continue Course →' : 'Preview Course →'}
        </a>
      </div>
    `;

    return card;
  }

  formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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
