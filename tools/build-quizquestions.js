#!/usr/bin/env node
// ===========================================================
// tools/build-quizquestions.js
// Converts the authored quiz banks in docs/resources/quizzes/
// into an idempotent SQL seed for the public.quiz_questions table,
// so the live practice quiz (tools/basic-network-quiz.html) serves
// these questions instead of the generic fallback pool.
//
// Quiz banks are instructor-facing markdown (one file per module):
//
//   ## Multiple Choice
//   **1.** Question text
//   - A. Option
//   - B. Option
//   ...
//   ## Answer Key
//   1. **B** — explanation referencing the source module/section
//
// Only the Multiple Choice questions are imported (options +
// correct_index + explanation); the Short Answer section stays in
// the authored docs for instructors. Rows are keyed to a module by
// joining modules on (course_id, module_number), so it works whatever
// the real module ids are. Each module is seeded at most once: if it
// already has any ACTIVE questions, its batch is skipped (same guard
// as the sql/40 module-27 seed).
// ===========================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUIZ_DIR = path.join(ROOT, 'docs', 'resources', 'quizzes');
const OUT = path.join(ROOT, 'sql', '49-question-banks.sql');

const MC_RE = /^\*\*(\d+)\.\*\*\s*(.*)$/;
const OPT_RE = /^-\s*([A-Z])\.\s+(.*)$/;
const KEY_RE = /^(\d+)\.\s*\*\*([A-Z])\*\*\s*—?\s*(.*)$/;

function sql(s) {
  return s.replace(/'/g, "''");
}

function courseFromDir(dir) {
  const segments = dir.split(path.sep);
  if (segments.includes('cabling')) return 'cabling';
  if (segments.includes('networking')) return 'networking';
  return null;
}

// Collect all potential roster entries.
const entries = []; // { course, moduleNumber, questions: [{q, options[], correct, explanation}] }
const warnings = [];

function walkRec(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRec(full);
    else if (entry.isFile() && entry.name.endsWith('-quiz.md')) {
      const course = courseFromDir(dir);
      if (!course) { warnings.push(`skip ${full}: unknown course dir`); continue; }
      const mNum = (entry.name.match(/^module-(\d+)-/) || [])[1];
      if (!mNum) { warnings.push(`skip ${full}: no module-NN prefix`); continue; }
      entries.push(parseBank(full, course, Number(mNum)));
    }
  }
}

function parseBank(file, course, moduleNumber) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  // --- isolate Multiple Choice block ---
  let mc = [];
  let inMc = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s+Multiple Choice\s*$/.test(l)) { inMc = true; continue; }
    if (inMc && (/^##\s+/.test(l))) break;
    if (inMc) mc.push(l);
  }

  // --- isolate Answer Key block ---
  let key = [];
  let inKey = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^##\s+Answer Key\s*$/.test(l)) { inKey = true; continue; }
    if (inKey && (/^##\s+/.test(l) || /^>/.test(l))) break;
    if (inKey) key.push(l);
  }

  const answers = new Map(); // qNum -> { letter, explanation }
  for (const l of key) {
    const m = l.match(KEY_RE);
    if (m) answers.set(Number(m[1]), { letter: m[2], explanation: m[3] || '' });
  }

  // --- group Multiple Choice lines into questions ---
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

  // --- pair each multiple-choice question with its answer ---
  const results = [];
  for (const q of questions) {
    const a = answers.get(q.num);
    if (!a || q.options.length === 0) {
      if (!a) warning(`${file}: Q${q.num} has no answer-key entry (skipped)`);
      continue;
    }
    const idx = a.letter.charCodeAt(0) - 65; // A=0
    if (idx < 0 || idx >= q.options.length) {
      warning(`${file}: Q${q.num} answer ${a.letter} out of range (skipped)`);
      continue;
    }
    results.push({
      q: q.text.trim(),
      options: q.options,
      correct: idx,
      explanation: a.explanation.trim()
    });
  }
  return { course, moduleNumber, questions: results, file: fileName(file) };
}

function sqlValue(entry) {
  const opts = 'to_jsonb(ARRAY[' + entry.options.map(o => `'${sql(o)}'`).join(', ') + '])';
  return `('${entry.course}', ${entry.moduleNumber}, '${sql(entry.q)}', ${opts}, ${entry.correct}, '${sql(entry.explanation)}')`;
}

function build() {
  walkRec(QUIZ_DIR);
  const rows = [];
  for (const e of entries) {
    for (const q of e.questions) {
      rows.push({ course: e.course, moduleNumber: e.moduleNumber, ...q });
    }
  }

  let sql = `-- ===========================================================
-- 49-question-banks-from-quizzes.sql
-- AUTO-GENERATED by tools/build-quizquestions.js — do not hand-edit.
-- Rebuild with:  node tools/build-quizquestions.js
--
-- Imports the authored quiz banks (docs/resources/quizzes/**)
-- into public.quiz_questions. One row per multiple-choice question,
-- keyed to a module by (course_id, module_number). A module is only
-- seeded if it has NO active questions yet (idempotent re-runs).
-- ===========================================================\n\n`;

  sql += `INSERT INTO public.quiz_questions (module_id, question, options, correct_index, explanation)\nSELECT m.id, q.question, q.options, q.correct_index, q.explanation\nFROM modules m\nJOIN ( VALUES\n`;
  sql += rows.map(r => '  ' + sqlValue(r)).join(',\n');
  sql += `\n) AS q(course_id, module_number, question, options, correct_index, explanation)\n`;
  sql += `  ON m.course_id = q.course_id AND m.module_number = q.module_number\n`;
  sql += `WHERE NOT EXISTS (\n  SELECT 1\n  FROM public.quiz_questions qq\n  JOIN public.modules mm ON mm.id = qq.module_id\n  WHERE mm.course_id = q.course_id\n    AND mm.module_number = q.module_number\n    AND qq.active = true\n);\n\n`;
  sql += `SELECT 'quiz question banks imported for ' || count(DISTINCT m.id) || ' module(s)'\nFROM public.modules m\nWHERE m.course_id IN ('cabling','networking')\n  AND m.module_number BETWEEN 1 AND 9;\n`;

  fs.writeFileSync(OUT, sql, 'utf8');

  const perCourse = {};
  entries.forEach(e => { perCourse[e.course] = (perCourse[e.course] || 0) + 1; });
  let total = 0;
  entries.forEach(e => (total += e.questions.length));

  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  console.log('modules: ' + Object.entries(perCourse).map(([c, n]) => `${c}=${n}`).join('  '));
  console.log(`MC questions: ${total}`);
  if (warnings.length) { console.log('\nWARNINGS'); warnings.forEach(w => console.log('  ' + w)); }
}

function fileName(p) { return path.basename(p); }

// start
build();