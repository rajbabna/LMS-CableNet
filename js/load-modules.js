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
    const completedCount = visible.filter(isCompleted).length;
    const courseProgress = totalModules ? completedCount / totalModules : 0;
    const finalQuizUnlocked = courseProgress >= FINAL_QUIZ_THRESHOLD;

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
        : `<button class="btn-complete${completed ? ' completed' : ''}" data-module-id="${module.id}" ${completed ? 'disabled' : ''}>
            ${completed ? '✓ Completed' : 'Mark Complete'}
          </button>`;

      const progressLabel = completed ? 'Complete' : (status === 'in-progress' ? 'In progress' : 'Not started');

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

    function phaseHead(idx, title, count, open) {
      return `<li class="module-group-head mg-toggle${open ? ' mg-open' : ''}" data-unit-head="phase-${idx}">
        <span class="mg-title">PHASE ${pad2(idx + 1)} — ${title}</span>
        <span class="mg-count">${count}</span>
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
          html += phaseHead(idx, title, mods.length, open);
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
        if (mod && window.ContentRenderer) ContentRenderer.openInfo(mod);
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

    renderCourseHead();
    readHashState();
    renderPhaseTabs();
    ensureFilterBar();
    renderGrid();

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
    if (moduleList) {
      moduleList.innerHTML = '<li><span style="color: #B91C1C;">Something went wrong loading this course: ' + err.message + '</span></li>';
    }
  }
}

// Export for use in other scripts
window.loadModulesForCourse = loadModulesForCourse;
