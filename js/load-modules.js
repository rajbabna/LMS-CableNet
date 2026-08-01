// ===========================================================
// load-modules.js
// Fetches modules from Supabase for a specific course
// and renders them dynamically on the course pages.
// Also renders per-module progress + "Mark Complete" buttons,
// which are handled by js/progress/progress-tracker.js
// ===========================================================

async function loadModulesForCourse(courseId) {
  const moduleList = document.querySelector('.module-list');
  
  if (!moduleList) {
    console.log('No .module-list container found — skipping module loading');
    return;
  }

  // Wait for auth-guard to finish setting the enrollment flag
  if (window.authGuardReady) {
    try { await window.authGuardReady; } catch (err) { /* guard redirected; bail */ return; }
  }

  // Tag the container so progress-tracker.js can read the course id
  moduleList.setAttribute('data-course-id', courseId);

  const isExpired = document.body.dataset.enrollmentExpired === 'true';
  // Preview = approved student who is NOT enrolled (or whose enrollment lapsed).
  const isPreview = document.body.dataset.enrolled !== 'true';

  // Show the appropriate notice banner
  const banner = document.getElementById('previewBanner');
  if (banner) {
    if (isExpired) {
      banner.className = 'preview-banner expired-banner';
      banner.style.display = 'block';
      banner.innerHTML = `
        <strong>Access expired</strong> — Your enrollment period has ended.
        <a href="student-dashboard.html">Back to dashboard</a>
      `;
    } else {
      banner.className = 'preview-banner';
      banner.style.display = isPreview ? 'block' : 'none';
      if (isPreview) {
        banner.innerHTML = `
          <strong>Preview mode</strong> — You're not enrolled in this course yet.
          You can browse the module list, but resources and progress tracking are locked.
          <a href="student-dashboard.html">Back to dashboard</a>
        `;
      }
    }
  }

  // Load completed modules for this student from the DB.
  let completedIds = new Set();
  if (!isPreview) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: completions } = await supabaseClient
          .from('module_completions')
          .select('module_id')
          .eq('user_id', user.id)
          .eq('status', 'completed');
        completedIds = new Set((completions || []).map(c => c.module_id));
      }
    } catch (err) {
      console.error('Could not load completions:', err);
    }
  }

  try {
    // Fetch all modules for this course, ordered by module number
    const { data: modules, error } = await supabaseClient
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('module_number', { ascending: true });

    if (error) {
      console.error('Error loading modules:', error);
      return;
    }

    // Clear any placeholder content
    moduleList.innerHTML = '';

    // If no modules found, show a message
    if (!modules || modules.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = '<span style="color: var(--ink-soft);">No modules available yet.</span>';
      moduleList.appendChild(li);
      return;
    }

    // Render each module as a list item
    modules.forEach(module => {
      const li = document.createElement('li');
      li.setAttribute('data-module-id', module.id);

      // Determine icon or label based on content type
      let contentLabel = 'open lesson';
      switch(module.content_type) {
        case 'pdf':
          contentLabel = 'open pdf';
          break;
        case 'video':
          contentLabel = 'watch video';
          break;
        case 'interactive':
          contentLabel = 'launch tool';
          break;
        case 'text':
          contentLabel = 'read article';
          break;
        default:
          contentLabel = 'open lesson';
      }

      const completed = completedIds.has(String(module.id)) || completedIds.has(module.id);

      const resourceHtml = isPreview
        ? `<span class="preview-locked">🔒 Preview only — enroll to open resources</span>`
        : `<a href="${module.content_url}" target="_blank">${contentLabel}</a>`;

      const completionHtml = isPreview
        ? `<div class="module-actions"><span class="preview-locked">🔒 Enrollment required</span></div>`
        : `<div class="module-actions">
            <button class="btn-complete${completed ? ' completed' : ''}" data-module-id="${module.id}" ${completed ? 'disabled' : ''}>
              ${completed ? '✓ Completed' : 'Mark Complete'}
            </button>
          </div>`;

      li.innerHTML = `
        <span class="mod-tag">MOD ${String(module.module_number).padStart(2, '0')}</span>
        <span>
          <strong>${module.title}</strong>
          ${module.description ? `<br><span style="font-size: 0.9em; color: var(--ink-soft);">${module.description}</span>` : ''}
          <br>
          ${resourceHtml}
          <div class="module-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${completed ? '100' : '0'}%"></div>
            </div>
            <div class="progress-text">${completed ? '100%' : '0%'}</div>
          </div>
          ${completionHtml}
        </span>
      `;

      moduleList.appendChild(li);
    });

  } catch (err) {
    console.error('Exception loading modules:', err);
  }
}

// Export for use in other scripts
window.loadModulesForCourse = loadModulesForCourse;
