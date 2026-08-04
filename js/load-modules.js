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

    // Hide the standalone practice quiz card from the course grid. It's
    // launched from the student dashboard instead of being a course module;
    // the module row is kept so submit_quiz_score / quiz_scores keep working.
    const clone = modules || [];
    const visible = clone.filter(m => m.id !== 27);

    // Final-quiz unlock: a module's Final quiz becomes available only once the
    // student has completed the course-completion threshold (fraction of
    // course modules). Defaults to ALL modules (i.e. at course completion);
    // lower it if finals should open earlier.
    const FINAL_QUIZ_THRESHOLD = 1.0;
    const totalModules = visible.length;
    const completedCount = visible.filter(m => completedIds.has(String(m.id)) || completedIds.has(m.id)).length;
    const courseProgress = totalModules ? completedCount / totalModules : 0;
    const finalQuizUnlocked = courseProgress >= FINAL_QUIZ_THRESHOLD;

    // If no modules found, show a message
    if (!visible || visible.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = '<span style="color: var(--ink-soft);">No modules available yet.</span>';
      moduleList.appendChild(li);
      return;
    }

    // Render each module as a grid card
    const typeDisplayNames = {
      lesson: 'Lesson',
      pdf: 'PDF',
      video: 'Video',
      interactive: 'Tool',
      text: 'Article'
    };

    // Feather-style stroke icons per content type.
    const TYPE_ICONS = {
      lesson: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
      pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
      interactive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>`
    };
    function iconFor(type) { return TYPE_ICONS[type] || TYPE_ICONS.lesson; }

    visible.forEach(module => {
      const li = document.createElement('li');
      li.setAttribute('data-module-id', module.id);

      const type = module.content_type || 'lesson';
      const typeBadge = `<span class="mod-type-badge mod-type-${type}">${typeDisplayNames[type] || type}</span>`;

      // Determine action label based on content type
      let contentLabel = 'open lesson';
      switch(type) {
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
        ? `<span class="preview-locked">🔒 Enrollment required</span>`
        : `<a class="module-open module-open-${type}" href="${module.content_url}" title="${contentLabel}" aria-label="${contentLabel}">${iconFor(type)}</a>`;

      const completionHtml = isPreview
        ? `<span class="preview-locked">🔒 Enrollment required</span>`
        : `<button class="btn-complete${completed ? ' completed' : ''}" data-module-id="${module.id}" ${completed ? 'disabled' : ''}>
            ${completed ? '✓ Completed' : 'Mark Complete'}
          </button>`;

      // Practice + Final quiz cards for this module. Practice is always open;
      // Final is locked until the course-completion threshold is reached.
      const qEnc = encodeURIComponent(module.title || '');
      const qParams = `module=${module.id}&course=${courseId}&mode=practice&title=${qEnc}`;
      const practiceHtml =
        `<a class="module-quiz-cq cq-practice" href="tools/basic-network-quiz.html?${qParams}" title="Practice quiz for this module" aria-label="Practice quiz">
          <span class="cq-icon">${iconFor('lesson')}</span><span class="cq-label">Practice</span>
        </a>`;
      const finalHtml = finalQuizUnlocked
        ? `<a class="module-quiz-cq cq-final" href="tools/basic-network-quiz.html?module=${module.id}&course=${courseId}&mode=final&title=${qEnc}" title="Final quiz for this module" aria-label="Final quiz">
            <span class="cq-icon">${iconFor('pdf')}</span><span class="cq-label">Final quiz</span>
          </a>`
        : `<span class="module-quiz-cq cq-final cq-locked" title="Complete ${totalModules - completedCount} more module(s) to unlock this final quiz">
            <span class="cq-icon">🔒</span><span class="cq-label">Final quiz</span>
          </span>`;
      const quizRow =
        `<div class="module-quiz">
          <div class="module-quiz-label">Quiz</div>
          <div class="module-quiz-pair">${practiceHtml}${finalHtml}</div>
        </div>`;

      li.innerHTML = `
        <div class="module-head-top">
          <span class="mod-tag">MOD ${String(module.module_number).padStart(2, '0')}</span>
          ${typeBadge}
        </div>
        <strong class="module-card-title">${module.title}</strong>
        ${module.description ? `<div class="module-desc">${module.description}</div>` : ''}
        <div class="module-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${completed ? '100' : '0'}%"></div>
          </div>
          <div class="progress-text">${completed ? '100%' : '0%'}</div>
        </div>
        <div class="module-actions">
          ${completionHtml}
          ${resourceHtml}
        </div>
        ${quizRow}
      `;

      moduleList.appendChild(li);
    });

    // Course-completion banner: once every module is done, offer the
    // certificate. Matches the final-quiz unlock threshold.
    if (finalQuizUnlocked && !isPreview && moduleList.parentNode) {
      const banner = document.createElement('div');
      banner.className = 'course-complete';
      banner.innerHTML = `
        <div class="cc-badge">🎓</div>
        <div class="cc-copy">
          <strong>Course complete — congratulations!</strong>
          <span>You've finished every module. Claim your certificate of completion.</span>
        </div>
        <a class="btn btn-primary cc-btn" href="certificate.html?course=${courseId}">View certificate</a>
      `;
      moduleList.parentNode.insertBefore(banner, moduleList);
    }

  } catch (err) {
    console.error('Exception loading modules:', err);
  }
}

// Export for use in other scripts
window.loadModulesForCourse = loadModulesForCourse;
