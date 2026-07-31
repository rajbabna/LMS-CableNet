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
        window.location.href = "pending.html";
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
      // Query course_progress_view for this user's courses
      const { data, error } = await this.supabase
        .from("course_progress_view")
        .select(`
          enrollment_id,
          user_id,
          course_id,
          course_title,
          port_number,
          total_modules,
          completed_modules,
          progress_percentage,
          status,
          enrolled_at,
          completed_at
        `)
        .eq("user_id", this.currentUser.id)
        .order("port_number", { ascending: true });

      if (error) {
        console.error("Fetch courses error:", error);
        throw error;
      }

      this.courses = data || [];
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

    // Calculate progress
    const progressPercent = course.progress_percentage || 0;
    const completedModules = course.completed_modules || 0;
    const totalModules = course.total_modules || 0;

    // Determine status and badge styling
    let statusLabel = "○ Not Started";
    let statusClass = "not-started";

    if (progressPercent === 100) {
      statusLabel = "✓ Completed";
      statusClass = "completed";
    } else if (progressPercent > 0) {
      statusLabel = "⟳ In Progress";
      statusClass = "in-progress";
    }

    // Format enrollment date
    const enrolledDate = this.formatDate(course.enrolled_at);

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
      
      <div class="progress-section">
        <div class="progress-label">
          <span>${completedModules} of ${totalModules} modules complete</span>
          <span class="progress-percentage">${progressPercent}%</span>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>

      <div class="enrollment-date">
        Enrolled ${enrolledDate}
      </div>

      <div class="course-status ${statusClass}">
        ${statusLabel}
      </div>

      <div class="course-actions">
        <a href="${courseLink}" class="btn-continue">
          Continue Course →
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
