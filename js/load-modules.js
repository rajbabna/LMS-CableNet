// ===========================================================
// load-modules.js
// Fetches a course + its units + modules from Supabase and
// renders them as a course DASHBOARD:
//
//   - course header (title / port / description / overall %)
//   - unit navigation rail (per-unit progress, click to filter)
//   - modules grouped into collapsible unit sections
//   - per-module progress + "Mark Complete" buttons, handled by
//     js/progress/progress-tracker.js
//
// Graceful fallback: if the `units` table / `modules.unit_id`
// migration (sql/45) hasn't been run yet, it renders the legacy
// flat lessons + resources layout instead.
// ===========================================================

// ---- Phase curriculum layout (course page restructure) ----
// Each course maps its modules (by `module_number`) into learning
// phases shown as tabs, so students scan a short curriculum (Foundations
// / Practice / Capstone) instead of one long list. Ranges are
// `[startModuleNumber, endModuleNumber, title]`. Any module whose number
// falls outside every range goes into the LAST phase, so demo/extra
// modules (91+) stay grouped with the capstone rather than vanishing.
const COURSE_PHASES = {
  cabling: [
    [1, 3, 'Foundations'],
    [4, 7, 'Practice'],
    [8, 10, 'Capstone']
  ],
  networking: [
    [1, 3, 'Fundamentals'],
    [4, 6, 'Operations'],
    [7, 10, 'Advanced']
  ]
};

function phaseIndexFor(moduleNumber, ranges) {
  if (!ranges || ranges.length === 0) return -1;
  const n = Number(moduleNumber || 0);
  for (let i = 0; i < ranges.length; i++) {
    if (n >= ranges[i][0] && n <= ranges[i][1]) return i;
  }
  if (n < ranges[0][0]) return 0;
  return ranges.length - 1;
}

// ---- Completion-change hooks ----
// progress-tracker.js calls window.recomputeCourseUI({ moduleId, completed })
// after a module is marked complete or reset. The currently-loaded course
// registers render closures here so the derived UI (course %, phase donuts,
// completion banner) stays in sync without a full page reload.
let activeCourseHooks = null;

window.recomputeCourseUI = function (delta) {
  if (activeCourseHooks) activeCourseHooks.applyChange(delta);
};

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

  // Load completed modules + quiz attempts (started signal) for this student.
  let completedIds = new Set();
  let startedIds = new Set();
  if (!isPreview) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const [completionsRes, attemptsRes] = await Promise.all([
          supabaseClient.from('module_completions')
            .select('module_id').eq('user_id', user.id).eq('status', 'completed'),
          supabaseClient.from('quiz_scores')
            .select('module_id').eq('user_id', user.id)
        ]);
        completedIds = new Set((completionsRes.data || []).map(c => c.module_id));
        startedIds = new Set((attemptsRes.data || []).map(s => s.module_id));
      }
    } catch (err) {
      console.error('Could not load completions:', err);
    }
  }

  const pad2 = n => String(n || 0).padStart(2, '0');
  const isCompleted = m => completedIds.has(String(m.id)) || completedIds.has(m.id);

  // Pause/resume: an in-progress quiz writes its state to this localStorage
  // key (see tools/basic-network-quiz.html). Read it here so the course page
  // can surface a "Resume" entry point instead of a fresh "Practice" one.
  const quizResumeKey = id => 'lms_quiz_resume_' + String(id);
  const quizResumeFor = id => {
    try {
      const raw = localStorage.getItem(quizResumeKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  };

  // Quiz progress panel: loads each module's single-quiz state from the
  // get_quiz_progress_for_course RPC (sql/50) in one round-trip, then renders
  // the status badge + best score bar inside each card.
  const quizProgressById = new Map();
  async function loadQuizProgress(courseId) {
    if (isPreview || !window.supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.rpc(
        'get_quiz_progress_for_course',
        { p_course_id: courseId }
      );
      if (error) { console.warn('Quiz progress unavailable:', error.message); return; }
      (data || []).forEach(r => quizProgressById.set(String(r.module_id), r));
    } catch (err) {
      console.warn('Quiz progress unavailable:', err && err.message);
    }
  }

  // Read the quiz panel's state from the load-quiz-progress map. The quiz is
  // a single assessment per module (no practice/final split), and the badge is
  // score-driven from the student's best score across all attempts:
  //   - Passed   : best >= 70 (matches the dashboard's quiz-passed definition)
  //   - Needs re-try : took the quiz but best < 70
  //   - Not started  : no recorded attempt
  function quizProgressPanel(m) {
    const qp = quizProgressById.get(String(m.id));
    // The new read model reports best score as practice_best_score; older DBs
    // still expose it as best_score. Accept either so the panel keeps working
    // whether or not the sql/50 migration has been applied.
    const rawBest = qp ? (qp.practice_best_score != null ? qp.practice_best_score : qp.best_score) : null;
    const best = rawBest != null ? Math.round(Number(rawBest)) : null;
    const practiceStarted = !!(qp && qp.practice_started);

    const cls = best != null && best >= 70 ? 'completed'
      : practiceStarted ? 'active'
      : 'pending';
    const label = best != null && best >= 70 ? 'Passed'
      : practiceStarted ? 'Needs re-try'
      : 'Not started';

    const score = best != null ? best : 0;
    const bestText = best != null ? best + '% best' : '—';
    const scoreText = best != null ? best + '%' : '0%';

    return `
      <div class="quiz-progress-section">
        <div class="quiz-progress-header">
          <span class="quiz-progress-title">Quiz progress</span>
          <span class="quiz-best-score">${bestText}</span>
        </div>
        <div class="quiz-badge-row">
          <span class="quiz-badge ${cls}">${label}</span>
        </div>
        <div>
          <div class="quiz-attempt-info">
            <span class="quiz-attempt-label">Module quiz</span>
            <span class="quiz-attempt-score">${scoreText}</span>
          </div>
          <div class="quiz-progress-bar" role="progressbar" aria-label="Module quiz progress"
               aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100">
            <div class="quiz-progress-bar-fill" style="width:${score}%"></div>
          </div>
        </div>
      </div>`;
  }

  try {
    // Fetch course metadata + units + modules in parallel.
    const [courseRes, unitsRes, modulesRes, allCoursesRes] = await Promise.all([
      supabaseClient.from('courses').select('*').eq('id', courseId).maybeSingle(),
      supabaseClient.from('units').select('*').eq('course_id', courseId)
        .order('sort_order', { ascending: true }).order('unit_number', { ascending: true }),
      supabaseClient.from('modules').select('*').eq('course_id', courseId)
        .order('module_number', { ascending: true }),
      supabaseClient.from('courses').select('id, title, port_number')
        .order('port_number', { ascending: true })
    ]);

    if (modulesRes.error) {
      console.error('Error loading modules:', modulesRes.error);
      moduleList.innerHTML = '<li><span style="color: #B91C1C;">Could not load course content: ' + modulesRes.error.message + '</span></li>';
      return;
    }

    moduleList.innerHTML = '';

    // Hide the standalone practice quiz card from the course grid. It's
    // launched from the student dashboard instead of being a course module;
    // the module row is kept so submit_quiz_score / quiz_scores keep working.
    const clone = modulesRes.data || [];
    const visible = clone.filter(m => m.id !== 27);

    // Final-quiz unlock: a module's Final quiz becomes available only once the
    // student has completed the course-completion threshold (fraction of
    // course modules). Defaults to ALL modules (i.e. at course completion).
    const FINAL_QUIZ_THRESHOLD = 1.0;
    const totalModules = visible.length;
    let completedCount = visible.filter(isCompleted).length;
    let courseProgress = totalModules ? completedCount / totalModules : 0;
    let finalQuizUnlocked = courseProgress >= FINAL_QUIZ_THRESHOLD;

    // Recomputes progress-derived values after a module is marked complete
    // or reset (progress-tracker.js calls back into these via the hooks
    // registered below). Everything else reads from these live values.
    function recalcProgress() {
      completedCount = visible.filter(isCompleted).length;
      courseProgress = totalModules ? completedCount / totalModules : 0;
      finalQuizUnlocked = courseProgress >= FINAL_QUIZ_THRESHOLD;
    }

    if (!visible || visible.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = '<span style="color: var(--ink-soft);">No modules available yet.</span>';
      moduleList.appendChild(li);
      return;
    }

    // ---- Unit structure (sql/45). Falls back to legacy flat layout. ----
    const course = courseRes.data || null;
    const unitList = (unitsRes.data || []).filter(u => u.course_id === courseId);
    const unitById = new Map(unitList.map(u => [u.id, u]));
    const modulesByUnit = new Map(unitList.map(u => [u.id, []]));
    const orphanModules = [];
    visible.forEach(m => {
      if (m.unit_id && unitById.has(m.unit_id)) modulesByUnit.get(m.unit_id).push(m);
      else orphanModules.push(m);
    });
    const legacy = unitList.length === 0;

    // ---- Shared card/type machinery (blueprint step) ----
    const typeDisplayNames = {
      lesson: 'Lesson', pdf: 'PDF', video: 'Video', interactive: 'Tool',
      text: 'Article', quiz: 'Quiz', link: 'Link'
    };
    const TAB_DEFS = [
      ['lesson', 'lessons', 'Lessons'], ['video', 'videos', 'Videos'],
      ['pdf', 'pdfs', 'PDFs'], ['interactive', 'tools', 'Tools'],
      ['text', 'articles', 'Articles'], ['quiz', 'quiz', 'Quiz'],
      ['link', 'links', 'Links']
    ];
    const typeToTab = {};
    TAB_DEFS.forEach(([type, key]) => { typeToTab[type] = key; });
    const typeLabel = {};
    TAB_DEFS.forEach(([type, key, label]) => { typeLabel[type] = label; });

    const TYPE_ICONS = {
      lesson: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
      pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
      interactive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>`,
      quiz: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`
    };
    function iconFor(type) { return TYPE_ICONS[type] || TYPE_ICONS.lesson; }

    const ACTION_ICONS = {
      play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
      download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
      open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };
    const RESET_ICON = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

    // ---- Card HTML ----
    function cardHtml(module) {
      const type = module.content_type || 'lesson';
      const typeBadge = `<span class="mod-type-badge mod-type-${type}">${typeDisplayNames[type] || type}</span>`;

      const completed = isCompleted(module);
      const started = startedIds.has(String(module.id)) || startedIds.has(module.id);

      let status;
      if (isPreview) status = 'locked';
      else if (!module.content_url) status = 'coming-soon';
      else if (completed) status = 'completed';
      else if (started) status = 'in-progress';
      else status = 'unlock';
      const STATUS_LABEL = {
        unlock: 'UNLOCK', 'in-progress': 'IN PROGRESS', completed: 'COMPLETED',
        locked: 'LOCKED', 'coming-soon': 'COMING SOON'
      };
      const statusBadge = `<span class="mod-status mod-status-${status}">${STATUS_LABEL[status]}</span>`;

      const contentLabel = {
        lesson: 'open lesson', pdf: 'open pdf', video: 'watch video',
        interactive: 'launch tool', text: 'read article', quiz: 'open quiz', link: 'open link'
      }[type] || 'open lesson';

      let actionIcon = ACTION_ICONS.open;
      if (type === 'lesson' || type === 'video') actionIcon = ACTION_ICONS.play;
      else if (type === 'pdf') actionIcon = ACTION_ICONS.download;

      let mainAction = '';
      if (status === 'unlock' || status === 'in-progress' || status === 'completed') {
        if (type === 'lesson' || type === 'link') {
          mainAction = `<a class="module-open module-open-${type}" href="${module.content_url}" target="${type === 'link' ? '_blank' : '_self'}" rel="noopener" title="${contentLabel}" aria-label="${contentLabel}">${actionIcon}</a>`;
        } else {
          mainAction = `<button type="button" class="module-open module-open-${type}" data-module-id="${module.id}" title="${contentLabel}" aria-label="${contentLabel}">${actionIcon}</button>`;
        }
      }

      const completionHtml = isPreview || status === 'coming-soon'
        ? `<span class="preview-locked">${status === 'coming-soon' ? '👷 Coming soon' : '🔒 Enrollment required'}</span>`
        : completed
          // Completed: disabled "✓ Completed" state + a separate reset icon.
          // The reset icon is its own element so students never confuse it with
          // the button, and the button instantly returns to "Mark Complete".
          ? `<button class="btn-complete completed" data-module-id="${module.id}" disabled>
              ✓ Completed
            </button>
            <button type="button" class="btn-complete-reset" data-module-id="${module.id}"
              title="Reset: un-complete this module" aria-label="Reset this module to incomplete">${RESET_ICON}</button>`
          : `<button class="btn-complete" data-module-id="${module.id}">Mark Complete</button>`;

      const progressLabel = completed ? 'Complete' : (status === 'in-progress' ? 'In progress' : 'Not started');

      const qEnc = encodeURIComponent(module.title || '');
      const qParams = `module=${module.id}&course=${courseId}&title=${qEnc}`;
      const resume = quizResumeFor(module.id);
      const quizIsResume = !!(resume && resume.deck && resume.deck.length);
      const quizHtml =
        `<a class="module-quiz-cq cq-practice" href="tools/basic-network-quiz.html?${qParams}" title="${quizIsResume ? 'Resume your in-progress quiz' : 'Quiz for this module'}" aria-label="${quizIsResume ? 'Resume quiz' : 'Quiz'}">
          <span class="cq-icon">${iconFor('lesson')}</span><span class="cq-label">${quizIsResume ? 'Resume' : 'Take quiz'}</span>
        </a>`;
      const quizRow =
        `<div class="module-quiz">
          <div class="module-quiz-label">Quiz</div>
          ${quizHtml}
        </div>`;

      const liClass = 'status-' + status;
      return `
        <li data-module-id="${module.id}" class="${liClass}">
          <div class="module-head-top">
            <span class="mod-tag">MOD ${pad2(module.module_number)}</span>
            ${statusBadge}
            ${typeBadge}
          </div>
          <strong class="module-card-title">${module.title}</strong>
          ${module.description ? `<div class="module-desc">${module.description}</div>` : ''}
          ${module.duration ? `<div class="module-duration">⏱ ${module.duration}</div>` : ''}
          <div class="module-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${completed ? '100' : '0'}%"></div>
            </div>
            <div class="progress-text">${progressLabel}</div>
          </div>
          ${quizProgressPanel(module)}
          <div class="module-actions">
            ${completionHtml}
            <div class="module-open-row">
              ${mainAction}
              <button type="button" class="module-open module-open-info" data-info="${module.id}" title="Module info" aria-label="Module info">${ACTION_ICONS.info}</button>
            </div>
          </div>
          ${quizRow}
        </li>`;
    }

    // ---- Section / group headers ----
    function groupHead(unit, count, open) {
      const title = unit.id === 'none'
        ? unit.title
        : `UNIT ${pad2(unit.unit_number)} — ${unit.title}`;
      return `<li class="module-group-head mg-toggle${open ? ' mg-open' : ''}" data-unit-head="${unit.id}">
        <span class="mg-title">${title}</span>
        <span class="mg-count">${count}</span>
        <span class="mg-caret">${open ? '▾' : '▸'}</span>
      </li>`;
    }

    function phaseHead(idx, title, done, total, open) {
      const pct = total ? Math.round((done / total) * 100) : 0;
      const donut = `<span class="mg-donut" style="--p:${pct}%" role="img" aria-label="${done} of ${total} complete">
        <span class="mg-donut-hole"><span class="mg-donut-num">${pct}%</span></span>
      </span>`;
      return `<li class="module-group-head mg-toggle${open ? ' mg-open' : ''}" data-unit-head="phase-${idx}">
        <span class="mg-title">PHASE ${pad2(idx + 1)} — ${title}</span>
        ${donut}
        <span class="mg-caret">${open ? '▾' : '▸'}</span>
      </li>`;
    }

    // ---- State ----
    let currentFilter = 'all';
    let currentPhase = 'all';
    const moduleById = new Map();
    const phaseRanges = COURSE_PHASES[courseId] || null;
    const openUnits = new Set(unitList.map(u => u.id));
    const openPhases = new Set(phaseRanges ? phaseRanges.map((_, i) => i) : []);
    let orphanOpen = true;

    // Resources tab state (built from resources/index.json)
    let resourceManifest = null;
    let resourcePromise = null;
    const resourceEsc = s => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Phase curriculum (course page restructure): modules are grouped into
    // learning phases shown as tabs. Courses without a phase map fall back
    // to the unit layout, then to the legacy flat list, so nothing breaks.
    const phaseTabsEl = document.getElementById('phaseTabs');
    const hasTabs = phaseRanges !== null || unitList.length > 0 || orphanModules.length > 0;

    function filterMatches(t) {
      if (currentFilter === 'all') return true;
      return typeToTab[t] === currentFilter;
    }

    function phaseFor(m) {
      return phaseIndexFor(m.module_number, phaseRanges);
    }

    function unitModules(unit) {
      return unit.id === 'none' ? orphanModules : (modulesByUnit.get(unit.id) || []);
    }

    // ---- Render: course header ----
    function renderCourseHead() {
      const head = document.getElementById('courseHead');
      if (!head || !course) return;
      head.hidden = false;
      const port = document.getElementById('coursePort');
      const titleEl = document.getElementById('courseTitle');
      const descEl = document.getElementById('courseDesc');
      const pctEl = document.getElementById('coursePct');
      const fillEl = document.getElementById('courseFill');
      const crumb = document.getElementById('breadcrumbCurrent');
      if (port) {
        port.textContent = 'PORT ' + pad2(course.port_number);
        port.className = 'port-num port-' + pad2(course.port_number);
      }
      if (titleEl) titleEl.textContent = course.title || 'Course';
      if (descEl && course.description) descEl.textContent = course.description;
      if (crumb) crumb.textContent = course.title || 'Course';
      const pct = Math.round(courseProgress * 100);
      if (pctEl) pctEl.textContent = (totalModules && pct === 0) ? 'Not started' : (pct + '%');
      if (fillEl) fillEl.style.width = pct + '%';
      document.title = (course.title || 'Course') + ' — Cable&Net Courses';

      // Overall-progress donut in the header — mirrors the progress bar above.
      const donut = document.getElementById('courseDonut');
      const donutPct = document.getElementById('courseDonutPct');
      const donutCaption = document.getElementById('courseDonutCaption');
      if (donut) {
        donut.hidden = false;
        const ring = donut.querySelector('.donut-ring');
        if (ring) ring.style.setProperty('--p', pct + '%');
      }
      if (donutPct) donutPct.textContent = pct + '%';
      if (donutCaption) donutCaption.textContent = `${completedCount} of ${totalModules} modules`;

      // Primary CTA: Start Course at 0%, otherwise Continue at the first
      // incomplete module (C7). Scrolls to the module list.
      const footer = document.getElementById('courseHeadFooter');
      if (footer) {
        const firstOpen = visible.find(m => !isCompleted(m) && m.content_url && !isPreview);
        const label = firstOpen
          ? `Continue: ${firstOpen.title} →`
          : (completedCount === totalModules && totalModules > 0 ? 'Course complete — review modules' : 'Start Course →');
        footer.innerHTML = `<a class="btn btn-primary course-cta" href="#moduleList">${label}</a>`;
      }
    }

    function syncHash(kind, val) {
      const h = '#' + kind + '-' + encodeURIComponent(String(val));
      if (window.history && window.history.replaceState && location.hash !== h) {
        history.replaceState(null, '', h);
      }
    }

    function readHashState() {
      const m = (location.hash || '').match(/^#(phase|filter)-([^&]+)$/);
      if (!m) return;
      const val = decodeURIComponent(m[2]);
      if (m[1] === 'phase') {
        const ok = val === 'all'
          || (phaseRanges && phaseRanges.some((_, i) => String(i) === val))
          || (!phaseRanges && (val === 'none' || unitList.some(u => u.id === val)));
        if (ok) currentPhase = val;
      } else if (m[1] === 'filter') {
        const ok = val === 'all' || val === 'resources'
          || Object.keys(typeToTab).some(t => typeToTab[t] === val);
        if (ok) currentFilter = val;
      }
    }

    function renderPhaseTabs() {
      if (!phaseTabsEl) return;
      const pct = p => Math.round((p || 0) * 100);
      const mk = (id, label, count, done) => {
        const prog = count ? done / count : 0;
        return `<button type="button" class="phase-tab${currentPhase === id ? ' active' : ''}" data-phase="${id}" role="tab" aria-selected="${currentPhase === id ? 'true' : 'false'}" title="${label}">
          <span class="phase-tab-label">${label}</span>
          <span class="phase-tab-progress"><span style="width:${pct(prog)}%"></span></span>
          <span class="phase-tab-count">${done}/${count}</span>
        </button>`;
      };
      const tabs = [mk('all', 'All', totalModules, completedCount)];
      if (phaseRanges) {
        phaseRanges.forEach((r, i) => {
          const mods = visible.filter(m => phaseFor(m) === i);
          const done = mods.filter(isCompleted).length;
          tabs.push(mk(i, r[2], mods.length, done));
        });
      } else {
        unitList.forEach(u => {
          const mods = modulesByUnit.get(u.id) || [];
          const done = mods.filter(isCompleted).length;
          tabs.push(mk(u.id, `UNIT ${pad2(u.unit_number)} — ${u.title}`, mods.length, done));
        });
        if (orphanModules.length) {
          const done = orphanModules.filter(isCompleted).length;
          tabs.push(mk('none', 'Extras', orphanModules.length, done));
        }
      }
      phaseTabsEl.innerHTML = tabs.join('');
      phaseTabsEl.hidden = !hasTabs;
    }

    // ---- Render: module grid ----
    function renderGrid() {
      moduleList.innerHTML = '';
      moduleById.clear();

      if (currentFilter === 'resources') {
        renderResources();
        return;
      }

      visible.forEach(m => moduleById.set(m.id, m));

      let html = '';

      if (phaseRanges) {
        // Phase-driven layout: curriculum tabs (Foundations → practice →
        // capstone). Clamps any phase index against the configured ranges.
        const phaseIds = currentPhase === 'all'
          ? phaseRanges.map((_, i) => i)
          : [Number(currentPhase)];
        phaseIds.forEach(idx => {
          if (Number.isNaN(idx) || idx < 0 || idx >= phaseRanges.length) return;
          const title = phaseRanges[idx][2];
          const mods = visible.filter(m => phaseFor(m) === idx && filterMatches(m.content_type || 'lesson'));
          if (mods.length === 0) return;
          const open = openPhases.has(idx);
          const done = mods.filter(isCompleted).length;
          html += phaseHead(idx, title, done, mods.length, open);
          if (open) html += mods.map(cardHtml).join('');
        });
      } else if (legacy) {
        // Pre-units fallback: flat lessons + resources split.
        const lessons = visible.filter(m => (m.content_type || 'lesson') === 'lesson');
        const resources = visible.filter(m => (m.content_type || 'lesson') !== 'lesson');
        if (currentFilter === 'all') {
          html += groupHead({ id: 'none', title: 'Core Lessons', unit_number: 1 }, lessons.length, true) + lessons.map(cardHtml).join('');
          if (resources.length) {
            html += groupHead({ id: 'none', title: 'Resources & Extras', unit_number: 2 }, resources.length, orphanOpen)
              + (orphanOpen ? resources.map(cardHtml).join('') : '');
          }
        } else {
          const shown = visible.filter(m => filterMatches(m.content_type || 'lesson'));
          html += groupHead({ id: 'none', title: typeLabel[currentFilter] || 'Modules', unit_number: 1 }, shown.length, true)
            + shown.map(cardHtml).join('');
        }
      } else {
        // Unit-driven layout.
        const unitIds = currentPhase === 'all'
          ? unitList.map(u => u.id).concat(orphanModules.length ? ['none'] : [])
          : [currentPhase];

        unitIds.forEach(id => {
          const unit = id === 'none' ? { id: 'none', title: 'Extras', unit_number: (unitList.length || 0) + 1 } : unitById.get(id);
          if (!unit) return;
          const mods = unitModules(unit).filter(m => filterMatches(m.content_type || 'lesson'));
          if (mods.length === 0) return;
          const open = unit.id === 'none' ? orphanOpen : openUnits.has(unit.id);
          html += groupHead(unit, mods.length, open);
          if (open) html += mods.map(cardHtml).join('');
        });
      }

      moduleList.innerHTML = html;
    }

    // ---- Resources tab ----
    function resourceCards(list) {
      return (list || []).map(r => {
        const locked = isPreview || isExpired;
        return `
          <li class="resource-card">
            <div class="module-head-top">
              <span class="mod-tag">RESOURCE</span>
              <span class="mod-status mod-status-unlock">REFERENCE</span>
            </div>
            <strong class="module-card-title">${resourceEsc(r.title)}</strong>
            ${r.description ? `<div class="module-desc">${resourceEsc(r.description)}</div>` : ''}
            <div class="module-actions" style="justify-content: flex-end;">
              ${locked
                ? `<span class="preview-locked">🔒 Enrollment required</span>`
                : `<a class="btn btn-primary resource-open" href="${r.file}" target="_blank" rel="noopener" style="font-size:0.76rem;">Open resource ↗</a>`}
            </div>
          </li>`;
      }).join('');
    }

    function renderResources() {
      if (resourceManifest) {
        const list = resourceManifest[courseId] || [];
        moduleList.innerHTML = list.length
          ? resourceCards(list)
          : '<li><span style="color: var(--ink-soft);">No resources for this course yet.</span></li>';
        return;
      }
      // First visit: show a skeleton, fetch the manifest, then render.
      moduleList.innerHTML = '<li class="skeleton"></li><li class="skeleton"></li>';
      if (!resourcePromise) {
        resourcePromise = fetch('resources/index.json')
          .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(data => { resourceManifest = data; return data; })
          .catch(err => { resourceManifest = {}; throw err; });
      }
      resourcePromise.then(() => renderResources())
        .catch(() => {
          moduleList.innerHTML = '<li><span style="color: #B91C1C;">Could not load resources.</span></li>';
        });
    }

    // ---- Filter tabs (types) ----
    function ensureFilterBar() {
      if (!moduleList.parentNode || moduleList.parentNode.querySelector('.module-filter')) return;
      const bar = document.createElement('div');
      bar.className = 'module-filter';
      bar.setAttribute('role', 'tablist');
      bar.setAttribute('aria-label', 'Filter modules by type');
      const present = new Set(visible.map(m => m.content_type || 'lesson'));
      const pills = [['all', 'All', true]]
        .concat(TAB_DEFS.map(([type, k, label]) => [k, label, present.has(type)]))
        .map(([k, label, enabled]) => {
          const dis = enabled ? '' : ' disabled aria-disabled="true" title="No content of this type yet"';
          const act = currentFilter === k;
          return `<button type="button" class="mf-btn${act ? ' active' : ''}${enabled ? '' : ' mf-disabled'}" data-filter="${k}" role="tab" aria-selected="${act ? 'true' : 'false'}"${dis}>${label}</button>`;
        }).join('');
      const resAct = currentFilter === 'resources';
      const resourcesBtn = `<span class="mf-sep" aria-hidden="true"></span><button type="button" class="mf-btn${resAct ? ' active' : ''}" data-filter="resources" role="tab" aria-selected="${resAct ? 'true' : 'false'}">Resources</button>`;
      bar.innerHTML = pills + resourcesBtn;
      moduleList.parentNode.insertBefore(bar, moduleList);
      bar.addEventListener('click', function (e) {
        const btn = e.target.closest('.mf-btn[data-filter]');
        if (!btn) return;
        currentFilter = btn.dataset.filter;
        bar.querySelectorAll('.mf-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        syncHash('filter', currentFilter);
        renderGrid();
      });
    }

    function updateFilterActive() {
      const bar = document.querySelector('.module-filter');
      if (!bar) return;
      bar.querySelectorAll('.mf-btn[data-filter]').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === currentFilter);
        b.setAttribute('aria-selected', b.dataset.filter === currentFilter ? 'true' : 'false');
      });
    }

    // ---- Phase tab interactions ----
    if (phaseTabsEl) {
      phaseTabsEl.addEventListener('click', function (e) {
        const btn = e.target.closest('.phase-tab[data-phase]');
        if (!btn) return;
        currentPhase = btn.dataset.phase;
        syncHash('phase', currentPhase);
        renderPhaseTabs();
        renderGrid();
      });
    }
    window.addEventListener('hashchange', () => {
      readHashState();
      renderPhaseTabs();
      updateFilterActive();
      renderGrid();
    });

    // ---- Unit section toggles + card interactions ----
    moduleList.addEventListener('click', function (e) {
      const toggle = e.target.closest('.module-group-head[data-unit-head]');
      if (toggle) {
        const id = toggle.dataset.unitHead;
        if (id.startsWith('phase-')) {
          const idx = Number(id.slice(6));
          if (openPhases.has(idx)) openPhases.delete(idx);
          else openPhases.add(idx);
        } else if (id === 'none') {
          orphanOpen = !orphanOpen;
        } else if (openUnits.has(id)) {
          openUnits.delete(id);
        } else {
          openUnits.add(id);
        }
        renderGrid();
        return;
      }
      const infoBtn = e.target.closest('.module-open-info[data-info]');
      if (infoBtn) {
        e.preventDefault();
        const mod = moduleById.get(Number(infoBtn.dataset.info));
        if (mod && window.ContentRenderer) {
          let statusLabel;
          if (isPreview) statusLabel = 'Locked — enrollment required';
          else if (!mod.content_url) statusLabel = 'Coming soon';
          else if (isCompleted(mod)) statusLabel = 'Completed';
          else if (startedIds.has(String(mod.id)) || startedIds.has(mod.id)) statusLabel = 'In progress';
          else statusLabel = 'Not started';
          ContentRenderer.openInfo(mod, statusLabel);
        }
        return;
      }
      const btn = e.target.closest('.module-open[data-module-id]');
      if (!btn) return;
      const mod = moduleById.get(Number(btn.dataset.moduleId));
      if (mod && mod.content_type && mod.content_type !== 'lesson' && window.ContentRenderer) {
        e.preventDefault();
        ContentRenderer.open(mod);
      }
    });

    // ---- Course cross-navigation in the header (other courses) ----
    const navCourses = document.querySelector('.nav-course-links');
    if (navCourses && !(allCoursesRes.error) && (allCoursesRes.data || []).length) {
      const others = (allCoursesRes.data || []).filter(c => c.id !== courseId);
      if (others.length) {
        navCourses.innerHTML = others.map(c =>
          `<a href="course.html?course=${encodeURIComponent(c.id)}">${c.title}</a>`
        ).join('');
      }
    }

    // ---- Completion-change hooks ----
    // progress-tracker.js calls window.recomputeCourseUI() after marking a
    // module complete or resetting one; we keep the derived UI in sync.
    activeCourseHooks = {
      applyChange(delta) {
        // completedIds may hold either a numeric id (loaded from the DB) or a
        // string id (added by a previous mark-complete this session), so clear
        // both representations on reset.
        const id = String(delta.moduleId);
        if (delta.completed) {
          completedIds.add(id);
        } else {
          completedIds.delete(id);
          completedIds.delete(Number(delta.moduleId));
        }
        recalcProgress();
        renderCourseHead();
        renderPhaseTabs();
        renderGrid();
        renderCompletionBanner();
        // A module reset also clears the quiz, so re-fetch the quiz progress
        // panel state (best score / badge) for the course once the DB delete
        // has landed, then re-render to drop the card back to "Not started".
        if (delta.quizReset) {
          loadQuizProgress(courseId).then(renderGrid);
        }
      }
    };

    function renderCompletionBanner() {
      const container = moduleList.parentNode;
      if (!container) return;
      container.querySelectorAll('.course-complete').forEach(el => el.remove());
      if (finalQuizUnlocked && !isPreview) {
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
        container.insertBefore(banner, moduleList);
      }
    }

    renderCourseHead();
    readHashState();
    renderPhaseTabs();
    ensureFilterBar();
    renderGrid();
    renderCompletionBanner();

    // Load quiz progress in the background, then re-render once available so
    // the card's quiz panels fill in without blocking first paint.
    //
    // Re-fetch on refocus / bfcache-restore: the quiz runs in a separate tab
    // (`tools/basic-network-quiz.html` via an <a href>), so when the student
    // returns to this tab after submitting, refresh the panels so the new
    // score appears immediately instead of showing stale data.
    async function refreshProgress() {
      // Re-fetch both quiz state and module completions so a reset performed
      // in another tab (instructor dashboard) is reflected here — the header
      // progress bar/donut must drop instead of staying "complete".
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        try {
          const res = await supabaseClient.from('module_completions')
            .select('module_id').eq('user_id', user.id).eq('status', 'completed');
          completedIds = new Set((res.data || []).map(c => c.module_id));
          recalcProgress();
        } catch (err) {
          console.error('Could not refresh completions:', err);
        }
      }
      await loadQuizProgress(courseId).then(renderGrid);
      renderCourseHead();
    }
    refreshProgress();
    window.addEventListener('focus', refreshProgress);
    window.addEventListener('pageshow', refreshProgress);

  } catch (err) {
    console.error('Exception loading modules:', err);
    if (moduleList) {
      moduleList.innerHTML = '<li><span style="color: #B91C1C;">Something went wrong loading this course: ' + err.message + '</span></li>';
    }
  }
}

// Export for use in other scripts
window.loadModulesForCourse = loadModulesForCourse;
