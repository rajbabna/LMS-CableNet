#!/usr/bin/env node
// ===========================================================
// tools/build-study-packs.js
// Generates downloadable, single-file offline study packs from
// the same authored sources the live course uses:
//
//   * Quiz questions  -> docs/resources/quizzes/**/*-quiz.md
//                        (the banks sql/49 imports, so the pack
//                         embeds exactly what the online quiz
//                         deals from)
//   * Study notes     -> docs/cablenet-courses-bundle/*.md
//                        (the authored lesson bundles)
//
// It injects them into tools/study-pack-template.html and emits
// one ready-to-download HTML per module:
//
//   study-packs/<course>-module-<NN>.html
//
// Module ids map to the live DB's modules.id (used by the
// submit_quiz_score RPC). If the live project gets rebuilt from
// scratch, re-verify ids before regenerating (see MODULES below).
//
// Run:  node tools/build-study-packs.js
// ===========================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUIZ_DIR = path.join(ROOT, 'docs', 'resources', 'quizzes');
const BUNDLE_DIR = path.join(ROOT, 'docs', 'cablenet-courses-bundle');
const TEMPLATE = path.join(ROOT, 'tools', 'study-pack-template.html');
const OUT_DIR = path.join(ROOT, 'tools', 'study-packs');

// ------------------------------------------------------------
// Live DB module ids (verified against the deployed project).
// course_id -> module_number -> { id, bundle file }
// ------------------------------------------------------------
const MODULES = {
  cabling: {
    1: { id: 9,  bundle: 'module-01-osi-topologies.md' },
    2: { id: 10, bundle: 'module-02-cabling-standards.md' },
    3: { id: 11, bundle: 'module-03-rj45-connectors.md' },
    4: { id: 12, bundle: 'module-04-crimping-first-practice.md' },
    5: { id: 13, bundle: 'module-05-crimping-marathon.md' },
    6: { id: 14, bundle: 'module-06-troubleshooting.md' },
    7: { id: 15, bundle: 'module-07-devices-packet-tracer.md' },
    8: { id: 16, bundle: 'module-08-certification-prep.md' },
    9: { id: 17, bundle: 'module-09-final-assessment.md' }
  },
  networking: {
    1: { id: 18, bundle: 'part2-module-01-ip-addressing.md' },
    2: { id: 19, bundle: 'part2-module-02-subnetting.md' },
    3: { id: 20, bundle: 'part2-module-03-packet-tracer-ip.md' },
    4: { id: 21, bundle: 'part2-module-04-dhcp-dns.md' },
    5: { id: 22, bundle: 'part2-module-05-routing.md' },
    6: { id: 23, bundle: 'part2-module-06-troubleshooting-methods.md' },
    7: { id: 24, bundle: 'part2-module-07-troubleshooting-labs.md' },
    8: { id: 25, bundle: 'part2-module-08-security-basics.md' },
    9: { id: 26, bundle: 'part2-module-09-final-assessment.md' }
  }
};

// Course display labels, injected into the pack note.
const COURSES = {
  cabling: 'Network Foundations — Cabling & Infrastructure',
  networking: 'Network Operations — Configuration & Troubleshooting'
};

// ------------------------------------------------------------
// Quiz bank parsing (same structures as build-quizquestions.js)
// ------------------------------------------------------------
const MC_RE = /^\*\*(\d+)\.\*\*\s*(.*)$/;
const OPT_RE = /^-\s*([A-Z])\.\s+(.*)$/;
const KEY_RE = /^(\d+)\.\s*\*\*([A-Z])\*\*\s*—?\s*(.*)$/;

function courseFromDir(dir) {
  const segments = dir.split(path.sep);
  if (segments.includes('cabling')) return 'cabling';
  if (segments.includes('networking')) return 'networking';
  return null;
}

function collectQuizBanks() {
  const byKey = {}; // "course:moduleNumber" -> questions[]
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('-quiz.md')) {
        const course = courseFromDir(dir);
        if (!course) continue;
        const mNum = (entry.name.match(/^module-(\d+)-/) || [])[1];
        if (!mNum) continue;
        const questions = parseBank(full);
        const key = course + ':' + Number(mNum);
        byKey[key] = (byKey[key] || []).concat(questions);
      }
    }
  }
  walk(QUIZ_DIR);
  return byKey;
}

function parseBank(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  let mc = []; let inMc = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s+Multiple Choice\s*$/.test(l)) { inMc = true; continue; }
    if (inMc && /^##\s+/.test(l)) break;
    if (inMc) mc.push(l);
  }

  let key = []; let inKey = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s+Answer Key\s*$/.test(l)) { inKey = true; continue; }
    if (inKey && (/^##\s+/.test(l) || /^>/.test(l))) break;
    if (inKey) key.push(l);
  }

  const answers = new Map();
  for (const l of key) {
    const m = l.match(KEY_RE);
    if (m) answers.set(Number(m[1]), { letter: m[2], explanation: m[3] || '' });
  }

  const questions = [];
  let cur = null;
  for (const l of mc) {
    const qm = l.match(MC_RE);
    if (qm) {
      if (cur) questions.push(cur);
      cur = { num: Number(qm[1]), text: qm[2], options: [] };
      continue;
    }
    const om = l.match(OPT_RE);
    if (om && cur) cur.options.push(om[2]);
  }
  if (cur) questions.push(cur);

  const results = [];
  for (const q of questions) {
    const a = answers.get(q.num);
    if (!a || !q.options.length) continue;
    const idx = a.letter.charCodeAt(0) - 65;
    if (idx < 0 || idx >= q.options.length) continue;
    results.push({
      id: q.num,
      question: q.text.trim(),
      options: q.options,
      correct_index: idx,
      explanation: a.explanation.trim()
    });
  }
  return results;
}

// ------------------------------------------------------------
// Minimal markdown -> HTML for study notes
// (subset used by the lesson/resource bundles)
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

function mdToNotes(file) {
  if (!fs.existsSync(file)) {
    return { title: 'Study Pack', sections: [{ title: 'Key takeaways', html: '<p>Study notes for this module are coming soon.</p>' }] };
  }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const sections = [];
  let curTitle = null;
  let curHtml = '';
  let inCode = false;
  let h1Title = '';
  let started = false; // sections begin only after the first "##" H2

  function flush() {
    if (curTitle) sections.push({ title: curTitle, html: curHtml });
    curTitle = null; curHtml = '';
  }

  const linesByLine = {};
  lines.forEach((l, i) => { linesByLine[i] = l; });

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const l = raw.trimEnd();
    const h1 = l.match(/^#\s+(.*)$/);
    const h2 = l.match(/^##\s+(.*)$/);
    if (h1) {
      h1Title = h1[1];
      started = false;
      flush();
      continue;
    }
    if (h2) {
      flush();
      started = true;
      curTitle = h2[1];
      continue;
    }
    if (!started) continue; // skip H1 banner + meta prelude
    if (l.startsWith('```')) { inCode = !inCode; continue; }
    if (l.startsWith('---') || l.startsWith('>')) continue;

    if (inCode) { curHtml += esc(l) + '\n'; continue; }

    const tableStart = l.startsWith('|');
    if (tableStart) {
      // Collect contiguous table rows
      const rows = [l];
      let j = li + 1;
      while (j < lines.length && lines[j].trimStart().startsWith('|')) {
        rows.push(lines[j]);
        j++;
      }
      const cells = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).filter((r) => r.split('|').length > 1).map(cells).filter((r) => r.length > 1);
      let t = '<table><thead><tr>' + head.map((h) => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>';
      t += body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('');
      t += '</tbody></table>';
      curHtml += t + '\n';
      li = j - 1;
      continue;
    }
    if (/^-{3,}/.test(l)) { curHtml += '<hr>\n'; continue; }

    const h3 = l.match(/^###\s+(.*)$/);
    if (h3) { curHtml += '<h3>' + inline(h3[1]) + '</h3>\n'; continue; }

    const ul = l.match(/^[-*]\s+(.*)$/);
    if (ul) { curHtml += '<li>' + inline(ul[1]) + '</li>\n'; continue; }

    const ol = l.match(/^\d+\.\s+(.*)$/);
    if (ol) { curHtml += '<li>' + inline(ol[1]) + '</li>\n'; continue; }

    if (l.trim() === '') { curHtml += '\n'; continue; }

    curHtml += inline(l) + '\n';
  }
  flush();

  const clean = [];
  for (const s of sections) {
    let html = s.html;
    html = html.replace(/\n{3,}/g, '\n\n');
    // Wrap consecutive list items in <ul>
    html = html.replace(/((?:<li>[^]*?<\/li>\n?)+)/g, '<ul>$1</ul>');
    // Collapse whitespace
    html = html.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    clean.push({ title: s.title, html });
  }
  return { sections: clean, title: h1Title };
}

// ------------------------------------------------------------
// Pack assembly
// ------------------------------------------------------------
function build() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const banks = collectQuizBanks();
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const built = [];
  const issues = [];

  for (const course of Object.keys(MODULES)) {
    for (const mNum of Object.keys(MODULES[course])) {
      const info = MODULES[course][mNum];
      const key = course + ':' + mNum;
      const questions = banks[key] || [];
      if (!questions.length) {
        issues.push(`skip ${course} module ${mNum}: no quiz bank`);
        continue;
      }

      const notesFile = path.join(BUNDLE_DIR, info.bundle);
      const notes = mdToNotes(notesFile);

      const packTitle = notes.title || `Module ${mNum} Study Pack`;

      const dataObj = {
        moduleId: info.id,
        title: packTitle,
        version: '1.0',
        note: `${COURSES[course]} — module ${mNum}. Offline study pack: read the notes, take the quiz, then save your best score to the course while online.`,
        notes: { sections: notes.sections },
        quiz: { questions }
      };

      const dataJs = JSON.stringify(dataObj, null, 2);

      // Inject data + sync config into the template (single-file pack).
      let out = template;
      out = out.replace(/var STUDY_PACK = \{[\s\S]*?\n  \};/, 'var STUDY_PACK = ' + dataJs.replace(/\n/g, '\n  ') + ';');
      out = out.replace(/var SYNC = \{[\s\S]*?\n  \};/, [
        'var SYNC = {',
        '  enabled: true,',
        "  supabaseUrl: 'https://mantjzpfhikezztonrga.supabase.co',",
        "  supabaseAnonKey: 'sb_publishable_t5GiOxBzTlWkRDR0pS0f0g_L1JhYfI0',",
        "  rpc: 'submit_quiz_score'",
        '};'
      ].join('\n'));

      const safeCourse = course;
      const outFile = path.join(OUT_DIR, `${safeCourse}-module-${String(mNum).padStart(2, '0')}.html`);
      fs.writeFileSync(outFile, out, 'utf8');
      built.push({ file: outFile, moduleId: info.id, title: packTitle, q: questions.length });
    }
  }

  console.log(`Built ${built.length} study packs -> ${path.relative(ROOT, OUT_DIR)}/`);
  built.sort((a, b) => a.file.localeCompare(b.file));
  for (const b of built) {
    console.log(`  ${path.basename(b.file)}  (module ${b.moduleId} · ${b.q} questions · ${b.title})`);
  }
  if (issues.length) {
    console.log('\nISSUES');
    issues.forEach((i) => console.log('  ' + i));
  }
}

build();