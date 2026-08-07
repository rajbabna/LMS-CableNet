#!/usr/bin/env node
// ===========================================================
// tools/validate-batches.js
// Validates docs/resources/batches/batches.json against the
// batch rules in docs/resources/batches/README.md:
//
//   1. schemaVersion is present and 1
//   2. batch ids are unique, non-empty strings
//   3. a student appears in EXACTLY ONE batch (no cross-batch dupes)
//   4. no duplicate student within a single batch
//   5. every student is a non-empty string that looks like an email
//   6. `test-users` is the only reserved QA id, flagged isTest
//
// Exits 0 on success, 1 if any rule fails. Human-readable report.
// ===========================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROSTER = process.argv[2] || path.join(__dirname, '..', 'docs', 'resources', 'batches', 'batches.json');
const RESERVED_TEST_ID = 'test-users';

const problems = []; // { batch, student, rule, message }
const warnings = [];

function err(batch, student, rule, message) {
  problems.push({ batch, student, rule, message });
}

// ---- 1. Load + structural integrity ----
let data;
try {
  data = JSON.parse(fs.readFileSync(ROSTER, 'utf8'));
} catch (e) {
  console.error(`FAIL  ${ROSTER} is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (!data || data.schemaVersion !== 1) {
  err('(file)', null, 'schemaVersion', 'schemaVersion must be present and equal to 1');
}
if (!Array.isArray(data.batches)) {
  err('(file)', null, 'batches', 'batches must be an array');
  data.batches = data.batches || [];
}

const seenIds = new Map();      // id -> batch index
const seenStudents = new Map(); // normalized email -> batch id

data.batches.forEach((batch, i) => {
  const id = batch && batch.id;
  const label = id || `batch #${i + 1}`;

  // ---- 2. batch ids ----
  if (typeof id !== 'string' || id.trim() === '') {
    err(label, null, 'id', 'batch id must be a non-empty string');
    return; // cannot run further per-batch checks without an id
  }
  if (seenIds.has(id)) {
    err(id, null, 'unique-id', `duplicate batch id (also at index ${seenIds.get(id)})`);
  } else {
    seenIds.set(id, i);
  }

  const students = Array.isArray(batch.students) ? batch.students : [];

  // ---- 3. exactly one batch per student (across batches) ----
  const withinBatch = new Set();
  students.forEach((s, j) => {
    if (typeof s !== 'string' || s.trim() === '') {
      err(id, String(j), 'student-format', 'student must be a non-empty string');
      return;
    }
    const norm = s.trim().toLowerCase();

    // ---- 4. no duplicates within a single batch ----
    if (withinBatch.has(norm)) {
      err(id, s, 'duplicate-in-batch', 'student listed more than once in the same batch');
    }
    withinBatch.add(norm);

    if (seenStudents.has(norm)) {
      err(id, s, 'exactly-one-batch', `student also in batch "${seenStudents.get(norm)}"`);
    } else {
      seenStudents.set(norm, id);
    }

    // ---- 5. email shape ----
    if (!/^[^@\s]+@[^@\s]+\.\w{2,}$/.test(s.trim())) {
      warnings.push(`WARN  [${id}] "${s}" does not look like a standard email address`);
    }
  });

  // ---- 6. reserved test-users id / isTest flag ----
  if (id === RESERVED_TEST_ID && batch.isTest !== true) {
    err(id, null, 'isTest', `reserved batch "${RESERVED_TEST_ID}" must set isTest: true`);
  }
  if (batch.isTest === true && id !== RESERVED_TEST_ID) {
    err(id, null, 'isTest', `only the reserved "${RESERVED_TEST_ID}" batch may be isTest: true`);
  }
});

// ---- Report ----
console.log(`Validating ${ROSTER}\n`);
if (problems.length === 0) {
  console.log('PASS  all batch rules hold');
} else {
  problems.forEach(p => {
    const loc = [p.batch, p.student].filter(Boolean).join(' / ');
    console.log(`FAIL  [${p.rule}] ${loc}: ${p.message}`);
  });
}
warnings.forEach(w => console.log(w));

console.log('');
console.log(`SUMMARY: ${data.batches.length} batch(es), ${seenStudents.size} student(s), ` +
  `${problems.length} failure(s), ${warnings.length} warning(s)`);

if (warnings.length) console.log('(warnings are informational and do not fail the check)');

process.exit(problems.length ? 1 : 0);
