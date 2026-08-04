#!/usr/bin/env node
// ===========================================================
// tools/build-lessons.js
// Generates static lesson HTML pages from the markdown lesson
// bundle (docs/cablenet-courses-bundle/*.md) and emits
// sql/31-course-content.sql (the DB migration that points the
// modules table at the generated pages).
//
// Source of truth: the markdown files. Edit the MD, re-run:
//   node tools/build-lessons.js
//
// Output:
//   lesson-cabling-01.html ... lesson-cabling-09.html
//   lesson-networking-01.html ... lesson-networking-09.html
//   sql/31-course-content.sql
//
// Markdown support is intentionally limited to what the lessons
// actually use: # / ### headings, paragraphs, "-" and "1." lists,
// | tables |, **bold**, `code`, and horizontal rules. Anything
// unrecognized is kept as escaped text so content is never lost.
// ===========================================================

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE = path.join(ROOT, 'docs', 'cablenet-courses-bundle');
const SQL_OUT = path.join(ROOT, 'sql', '31-course-content.sql');
const LIVE_URL = 'https://rajbabna.github.io/LMS-CableNet';

// ------------------------------------------------------------
// Courses: id -> { title, page, prefix in bundle filenames }
// ------------------------------------------------------------
const COURSES = [
  { id: 'cabling',    title: 'Network Foundations - Cabling & Infrastructure', page: 'course-cabling.html',    prefix: 'module-' },
  { id: 'networking', title: 'Network Operations - Configuration & Troubleshooting', page: 'course-networking.html', prefix: 'part2-module-' }
];

// ------------------------------------------------------------
// Minimal markdown -> HTML
// ------------------------------------------------------------
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// inline: **bold**, `code`
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

function parseTable(rows) {
  // rows[0] = header, rows[1] = separator (ignored), rest = body
  const cells = (row) => row
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells).filter((r) => r.length > 1);
  const th = head.map((h) => `<th>${inline(h)}</th>`).join('');
  const trs = body
    .map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>')
    .join('\n            ');
  return `        <div class="pinout-wrap">
          <table class="pinout-table">
            <thead><tr>${th}</tr></thead>
            <tbody>
            ${trs}
            </tbody>
          </table>
        </div>`;
}

// Convert a section's body lines into HTML blocks.
function renderBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // horizontal rule
    if (/^---+\s*$/.test(line)) { i++; continue; }

    // table block
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i]);
        i++;
      }
      if (rows.length >= 2) out.push(parseTable(rows));
      continue;
    }

    // bullet list (with indented continuation lines merged in)
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        if (/^\s*[-*]\s+/.test(lines[i])) {
          items.push([lines[i].replace(/^\s*[-*]\s+/, '')]);
        } else if (/^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1].push(lines[i].trim());
        } else if (lines[i].trim() === '') {
          i++;
          break;
        } else {
          break;
        }
        i++;
      }
      out.push('        <ul class="lesson-objectives">\n' +
        items.map((it) => `          <li>${inline(it.join(' '))}</li>`).join('\n') +
        '\n        </ul>');
      continue;
    }

    // numbered list (with indented continuation lines merged in)
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        if (/^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push([lines[i].replace(/^\s*\d+[.)]\s+/, '')]);
        } else if (/^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1].push(lines[i].trim());
        } else if (lines[i].trim() === '') {
          i++;
          break;
        } else {
          break;
        }
        i++;
      }
      out.push('        <ol class="lesson-questions">\n' +
        items.map((it) => `          <li>${inline(it.join(' '))}</li>`).join('\n') +
        '\n        </ol>');
      continue;
    }

    // paragraph: accumulate until blank line or next block start
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) out.push(`        <p>${inline(para.join(' '))}</p>`);
    else i++;
  }
  return out.join('\n\n');
}

// Split a lesson's markdown into sections.
// Returns { title, theme, moduleNumber, sections: [{heading, body}], unknowns }
function parseLesson(md, courseId, moduleNumber, filename) {
  const lines = md.split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+Module/.test(l)) || '';
  const title = titleLine.replace(/^#\s+Module\s+\d+\s*:\s*/, '').trim() || filename;
  const themeLine = lines.find((l) => /^#*\s*Module|Theme:/i.test(l) && l.includes('Theme:')) || '';
  const theme = (themeLine.match(/Theme:\s*["']?([^"']*)["']?/) || [])[1] || '';

  const sections = [];
  let cur = null;
  const unknowns = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (/^#\s+/.test(line)) continue; // skip H1 title
    if (/^##\s+/.test(line)) {
      if (cur && cur.body.length === 0 && /^(Wrap-Up|Arrival)/.test(cur.heading)) {
        // keep empty intro sections (they carry the time slot)
      }
      cur = { heading: line.replace(/^##\s+/, ''), body: [] };
      sections.push(cur);
      continue;
    }
    if (cur) cur.body.push(raw); // keep raw (preserves indentation for list continuations)
  }

  // Tag known section headings for the type of rendering
  sections.forEach((s) => {
    const h = s.heading;
    if (/learning objectives/i.test(h)) s.type = 'objectives';
    else if (/check for understanding/i.test(h)) s.type = 'questions';
    else if (/^Lab\b|^Scenario\b|^Practical\b/i.test(h)) s.type = 'lab';
    else if (/^Lecture Notes/i.test(h)) s.type = 'lecture';
    else if (/home assignment/i.test(h)) s.type = 'home';
    else s.type = 'generic';
    if (!/learning objectives|lecture notes|check for understanding|^lab|^scenario|^practical|home assignment|wrap-up|arrival|quiz|review|discussion|demo|safety|intensive|continued|practice|afternoon|setup|reflection|simulation|results|written|lunch|break|final|question|completion pathways|speed drills|technique|testing lab|lecture:/i.test(h)) {
      unknowns.push(h);
    }
  });

  return { title, theme, moduleNumber, sections, unknowns };
}

// ------------------------------------------------------------
// Page template
// ------------------------------------------------------------
function pageTemplate(course, lesson, prev, next) {
  const up = '../../';
  const navLinks = [];
  if (prev) navLinks.push(`      <a class="btn btn-ghost" href="${prev.file}">&larr; ${prev.label}</a>`);
  navLinks.push(`      <a class="btn btn-ghost" href="${up}${course.page}">Back to course</a>`);
  if (next) navLinks.push(`      <a class="btn btn-primary" href="${next.file}">${next.label} &rarr;</a>`);

  const sectionHtml = lesson.sections
    .filter((s) => s.body.length > 0)
    .map((s) => {
      const body = renderBlocks(s.body);
      return `    <section class="lesson-section">
      <h2>${inline(s.heading)}</h2>
${body}
    </section>`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(lesson.title)} â€” Cable&Net Courses</title>
  <meta name="description" content="Module ${lesson.moduleNumber}: ${esc(lesson.title)}. For enrolled students.">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../css/style.css">
</head>
<body data-course="${course.id}" data-module="${lesson.moduleNumber}">

<header class="site-header">
  <div class="brand">CABLE<strong>&amp;</strong>NET COURSES</div>
  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="primary-nav">
    <span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span>
  </button>
  <nav class="nav-actions" id="primary-nav">
    <a href="../../student-dashboard.html">Dashboard</a>
    <a href="${up}${course.page}">&larr; Back to ${course.id === 'cabling' ? 'Level 1' : 'Level 2'}</a>
    <span data-user-name style="margin-left:1.4rem; font-family: var(--font-mono); font-size: 0.82rem; color: var(--ink-soft);"></span>
    <a href="#" data-action="logout" style="margin-left:1.4rem;">Log out</a>
  </nav>
</header>

<div class="wire-divider">
  <span></span><span></span><span></span><span></span>
  <span></span><span></span><span></span><span></span>
</div>

<main>
  <article class="lesson">
    <header class="lesson-header">
      <span class="port-num">MOD ${String(lesson.moduleNumber).padStart(2, '0')}</span>
      <h1>Module ${lesson.moduleNumber}: ${esc(lesson.title)}</h1>
      <p class="lesson-theme">${esc(lesson.theme ? 'Theme: ' + lesson.theme : course.title)}</p>
    </header>

${sectionHtml}

    <nav class="lesson-nav">
${navLinks.join('\n')}
    </nav>
  </article>
</main>

<footer>Â© 2026 Raj Babna Â· Cable&amp;Net Courses</footer>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="../../js/config.js?v=9A0E5BF5"></script>
<script src="../../js/supabase-client.js?v=17E25610"></script>
<script src="../../js/auth-guard.js?v=38104837"></script>
<script src="../../js/menu.js"></script>
<script src="https://js.puter.com/v2/"></script>
<script src="../../js/ai-mentor.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const nameEl = document.querySelector('[data-user-name]');
      if (nameEl) nameEl.textContent = user.email;
    }
  });
</script>

</body>
</html>
`;
}

// ------------------------------------------------------------
// SQL migration emitter
// ------------------------------------------------------------
function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function emitSql(lessons) {
  const rows = [];
  for (const course of COURSES) {
    const list = lessons[course.id];
    for (const l of list) {
      const url = `${LIVE_URL}/lessons/${course.id}/lesson-${course.id}-${String(l.moduleNumber).padStart(2, '0')}.html`;
      const objSection = l.sections.find((s) => /learning objectives/i.test(s.heading));
      const firstObj = objSection
        ? (objSection.body.find((b) => /^\s*[-*]\s+/.test(b)) || objSection.body[0] || '')
            .replace(/^\s*[-*]\s+/, '')
            .slice(0, 120)
        : l.title;
      rows.push(`  ('${course.id}', ${l.moduleNumber}, '${sqlEscape(l.title)}', '${sqlEscape(firstObj)}', 'lesson', '${url}')`);
    }
  }

  return `-- ===========================================================
-- Step 31: Course content â€” 18 real modules pointing at the
-- generated lesson pages.
-- GENERATED by tools/build-lessons.js â€” do not edit by hand.
-- ===========================================================

-- Replace the 8 placeholder rows with the real 18-module catalog.
DELETE FROM public.modules
WHERE course_id IN ('cabling', 'networking');

INSERT INTO public.modules (course_id, module_number, title, description, content_type, content_url) VALUES
${rows.join(',\n')};

-- Reset the sequence so future inserts keep numbering sane.
SELECT setval('modules_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.modules));

-- ===========================================================
-- Verify
-- ===========================================================
-- SELECT course_id, module_number, title, content_url
-- FROM public.modules ORDER BY course_id, module_number;
`;
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
function listLessonFiles(course) {
  const dir = BUNDLE;
  const re = new RegExp('^' + course.prefix + '(\\d+)-');
  return fs.readdirSync(dir)
    .filter((f) => re.test(f) && f.endsWith('.md'))
    .sort((a, b) => {
      const na = parseInt(a.match(re)[1], 10);
      const nb = parseInt(b.match(re)[1], 10);
      return na - nb;
    });
}

const lessonsByCourse = {};
let totalWarnings = 0;

for (const course of COURSES) {
  const files = listLessonFiles(course);
  const parsed = files.map((f) => {
    const m = f.match(new RegExp('^' + course.prefix + '(\\d+)-'));
    const moduleNumber = parseInt(m[1], 10);
    const md = fs.readFileSync(path.join(BUNDLE, f), 'utf8');
    return parseLesson(md, course.id, moduleNumber, f);
  });

  parsed.forEach((l, idx) => {
    const fileName = () => `lesson-${course.id}-${String(l.moduleNumber).padStart(2, '0')}.html`;
    const prev = idx > 0 ? { file: `lesson-${course.id}-${String(parsed[idx - 1].moduleNumber).padStart(2, '0')}.html`, label: `Mod ${parsed[idx - 1].moduleNumber}` } : null;
    const next = idx < parsed.length - 1 ? { file: `lesson-${course.id}-${String(parsed[idx + 1].moduleNumber).padStart(2, '0')}.html`, label: `Mod ${parsed[idx + 1].moduleNumber}` } : null;
    const html = pageTemplate(course, l, prev, next);
    const outDir = path.join(ROOT, 'lessons', course.id);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, fileName());
    fs.writeFileSync(outFile, html);
    if (l.unknowns.length) {
      totalWarnings += l.unknowns.length;
      console.log(`  [warn] ${course.id} mod ${l.moduleNumber}: unclassified sections -> ${l.unknowns.join(' | ')}`);
    }
    console.log(`  wrote lessons/${course.id}/${fileName()}`);
  });

  lessonsByCourse[course.id] = parsed;
}

fs.writeFileSync(SQL_OUT, emitSql(lessonsByCourse));
console.log(`\nwrote ${SQL_OUT.split(path.sep).pop()}`);
console.log(totalWarnings ? `${totalWarnings} unclassified section(s) â€” check the pages visually` : 'All sections classified cleanly.');
