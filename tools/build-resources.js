#!/usr/bin/env node
// ===========================================================
// tools/build-resources.js
// Generates static, styled HTML pages from the ready study-
// resource markdown in docs/resources/ and emits a machine-
// readable manifest (resources/index.json) that the course page
// uses to build its "Resources" tab.
//
// Source of truth: the markdown files. Edit the MD, re-run:
//   node tools/build-resources.js
//
// Output:
//   resources/cabling/*.html        (cabling resources + shared)
//   resources/networking/*.html      (networking resources + shared)
//   resources/index.json             (manifest for load-modules.js)
//
// Markdown support is scoped to what the resource files use:
// # H1 (title), ## / ### headings, paragraphs, "-" / "1." lists,
// "- [ ]" checklists, "| tables |", "> blockquote" callouts,
// ``` fenced code ```, **bold**, `code`, and horizontal rules.
// Anything unrecognized is kept as escaped text so content survives.
// ===========================================================

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'resources');
const OUT = path.join(ROOT, 'resources');
const LIVE_URL = 'https://rajbabna.github.io/LMS-CableNet';

const COURSES = [
  { id: 'cabling',    title: 'Network Foundations - Cabling & Infrastructure', page: 'course.html?course=cabling' },
  { id: 'networking', title: 'Network Operations - Configuration & Troubleshooting', page: 'course.html?course=networking' }
];

// A resource bundle in docs/resources/<dir>/ belongs to this course
// (or to every course when the dir is "shared").
const DIR_TO_COURSES = { cabling: ['cabling'], networking: ['networking'], shared: ['cabling', 'networking'] };

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

function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

function parseTable(rows) {
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
  return `        <div class="rsrc-table-wrap">
          <table class="rsrc-table">
            <thead><tr>${th}</tr></thead>
            <tbody>
            ${trs}
            </tbody>
          </table>
        </div>`;
}

// Convert a document's body lines into HTML blocks.
function renderBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // horizontal rule
    if (/^---+\s*$/.test(t)) { i++; continue; }

    // H1 - skip (used as the page title)
    if (/^#\s+/.test(t)) { i++; continue; }

    // fenced code block
    if (/^```/.test(t)) {
      i++;
      const code = [];
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(`        <pre class="rsrc-pre"><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }

    // table block
    if (t.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i]);
        i++;
      }
      if (rows.length >= 2) out.push(parseTable(rows));
      continue;
    }

    // checkbox list
    if (/^\s*[-*]\s+\[( |x|X)\]\s+/.test(t)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+\[( |x|X)\]\s+/.test(lines[i].trim())) {
        const checked = /^\s*[-*]\s+\[x\]\s+/i.test(lines[i].trim());
        const text = lines[i].trim().replace(/^\s*[-*]\s+\[[ xX]\]\s+/, '');
        items.push(`          <li class="ck"><span class="ck-box">${checked ? '✓' : ''}</span>${inline(text)}</li>`);
        i++;
      }
      out.push('        <ul class="rsrc-checklist">\n' + items.join('\n') + '\n        </ul>');
      continue;
    }

    // blockquote callout
    if (/^>\s?/.test(t)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(`        <aside class="rsrc-callout">${inline(quote.join(' '))}</aside>`);
      continue;
    }

    // bullet list
    if (/^\s*[-*]\s+/.test(t)) {
      const items = [];
      while (i < lines.length) {
        if (/^\s*[-*]\s+/.test(lines[i].trim())) {
          items.push([lines[i].trim().replace(/^\s*[-*]\s+/, '')]);
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
      out.push('        <ul>\n' +
        items.map((it) => `          <li>${inline(it.join(' '))}</li>`).join('\n') +
        '\n        </ul>');
      continue;
    }

    // numbered list
    if (/^\s*\d+[.)]\s+/.test(t)) {
      const items = [];
      while (i < lines.length) {
        if (/^\s*\d+[.)]\s+/.test(lines[i].trim())) {
          items.push([lines[i].trim().replace(/^\s*\d+[.)]\s+/, '')]);
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
      out.push('        <ol>\n' +
        items.map((it) => `          <li>${inline(it.join(' '))}</li>`).join('\n') +
        '\n        </ol>');
      continue;
    }

    // heading
    if (/^#{2,6}\s+/.test(t)) {
      const level = Math.min(t.match(/^#+/)[0].length, 6);
      const text = t.replace(/^#+\s+/, '');
      out.push(`        <h${level}>${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // paragraph
    const para = [];
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('|') &&
      !/^\s*[-*]\s+/.test(lines[i].trim()) &&
      !/^\s*\d+[.)]\s+/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^\s*[-*]\s+\[( |x|X)\]\s+/.test(lines[i].trim()) &&
      !/^```/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) out.push(`        <p>${inline(para.join(' '))}</p>`);
    else i++;
  }
  return out.join('\n\n');
}

// Extract { title, description } from the md.
function parseResource(md, slug) {
  const lines = md.split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || '';
  const rawTitle = titleLine.replace(/^#\s+/, '').trim();
  const title = rawTitle.replace(/^Resource\s*:\s*/i, '').trim() || slug;

  // Description = the first "> ..." lines after the title (a short blurb),
  // minus anything that starts with "Course:".
  let description = '';
  let started = false;
  for (const l of lines) {
    const t = l.trim();
    if (/^#\s+/.test(t)) { started = true; continue; }
    if (!started) continue;
    if (/^>\s?/.test(t)) {
      const clean = t.replace(/^>\s?/, '').trim();
      if (clean && !/^Course:/i.test(clean) && !description) description = clean;
    } else if (!description && t) {
      description = t;
    }
    if (description) break;
  }

  return { title, description };
}

// ------------------------------------------------------------
// Page template (self-contained styling)
// ------------------------------------------------------------
function pageTemplate(course, meta, dirRel, backCourse) {
  const up = '../../';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(meta.title)} — Cable&Net Courses</title>
  <meta name="description" content="${esc(meta.description || meta.title)}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../css/style.css">

  <style>
    .resource { max-width: 820px; margin: 0 auto; }
    .resource-header { padding-bottom: 0.6rem; margin-bottom: 1.6rem; }
    .resource-header .port-num { margin-bottom: 0.8rem; }
    .resource-header h1 { margin: 0 0 0.5rem; font-size: 1.7rem; line-height: 1.2; }
    .resource-crumb { color: var(--ink-soft); font-family: var(--font-mono); font-size: 0.8rem; }
    .resource-section { padding: 1.1rem 0; }
    .resource-section:not(:last-child) { border-bottom: 1px solid var(--line); }
    .resource-section h3 { margin: 0 0 0.6rem; font-size: 1.05rem; }
    .resource p { line-height: 1.6; }
    .rsrc-callout {
      background: #EDF2F6; border-left: 4px solid var(--blue);
      padding: 0.7rem 1rem; border-radius: 6px; color: var(--ink);
      margin: 1rem 0;
    }
    .rsrc-table-wrap { overflow-x: auto; margin: 0.9rem 0; }
    .rsrc-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .rsrc-table th, .rsrc-table td { border: 1px solid var(--line); padding: 0.5rem 0.65rem; text-align: left; }
    .rsrc-table th { background: var(--paper); color: var(--ink); font-family: var(--font-mono); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .rsrc-table tr:nth-child(even) td { background: #FAF8F2; }
    .rsrc-pre { background: #1F2933; color: #E6EDF3; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; }
    .rsrc-checklist { list-style: none; padding: 0; margin: 0.9rem 0; }
    .rsrc-checklist li { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.35rem 0; }
    .ck-box { flex: 0 0 1.1rem; height: 1.1rem; border: 1px solid var(--line); border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: var(--green); font-size: 0.8rem; }
    @media (max-width: 640px) { .resource-header h1 { font-size: 1.35rem; } }
  </style>
</head>
<body data-course="${meta.course}" data-resource="${meta.slug}">

<header class="site-header">
  <div class="brand">CABLE<strong>&amp;</strong>NET COURSES</div>
  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="primary-nav">
    <span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span>
  </button>
  <nav class="nav-actions" id="primary-nav">
    <a href="../../student-dashboard.html">Dashboard</a>
    <a href="${up}${course.page}">&larr; Back to course</a>
    <span data-user-name style="margin-left:1.4rem; font-family: var(--font-mono); font-size: 0.82rem; color: var(--ink-soft);"></span>
    <a href="#" data-action="logout" style="margin-left:1.4rem;">Log out</a>
  </nav>
</header>

<div class="wire-divider">
  <span></span><span></span><span></span><span></span>
  <span></span><span></span><span></span><span></span>
</div>

<main>
  <article class="resource">
    <header class="resource-header">
      <span class="resource-crumb">STUDY RESOURCE · ${course.id.toUpperCase()}</span>
      <h1>${esc(meta.title)}</h1>
      ${meta.description ? `<p class="course-desc">${esc(meta.description)}</p>` : ''}
    </header>

${meta.body}

    <nav class="lesson-nav">
      <a class="btn btn-primary" href="${up}${course.page}">&larr; Back to course</a>
    </nav>
  </article>
</main>

<footer>&copy; 2026 Raj Babna &middot; Cable&amp;Net Courses</footer>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="../../js/config.js?v=9A0E5BF5"></script>
<script src="../../js/supabase-client.js?v=17E25610"></script>
<script src="../../js/auth-guard.js?v=2EB80F4C"></script>
<script src="../../js/menu.js?v=06BC2CFB"></script>
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
// Main
// ------------------------------------------------------------
function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

const manifest = { cabling: [], networking: [] };

for (const dirName of Object.keys(DIR_TO_COURSES)) {
  const dir = path.join(SRC, dirName);
  const files = listMd(dir);
  const ownerIds = DIR_TO_COURSES[dirName];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const md = fs.readFileSync(path.join(dir, file), 'utf8');
    const meta = parseResource(md, slug);
    // H2-start rendering happens below per-course so shared pages show
    // the correct course in the crumb/nav.
    const sectionLines = md.split(/\r?\n/);

    for (const courseId of ownerIds) {
      const course = COURSES.find((c) => c.id === courseId);
      const meta2 = JSON.parse(JSON.stringify(meta));
      meta2.course = courseId;
      meta2.slug = slug;
      meta2.body = renderBlocks(sectionLines);

      const outDir = path.join(OUT, courseId);
      fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, slug + '.html');
      fs.writeFileSync(outFile, pageTemplate(course, meta2, '', dirName));

      manifest[courseId].push({
        slug,
        title: meta2.title,
        description: meta2.description,
        category: dirName,
        file: `resources/${courseId}/${slug}.html`
      });
      console.log(`  wrote: resources/${courseId}/${slug}.html`);
    }
  }
}

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('\nwrote resources/index.json');