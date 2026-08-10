// Verifies the sync sign-in form appears on the results screen of a
// generated pack when online with no session, and that finishing a quiz
// persists an unsynced progress record.
const { chromium } = require('@playwright/test');
const path = require('path');

const pack = process.argv[2] || 'cabling-module-01.html';
const file = 'file:///' + path.resolve(__dirname, '../../tools/study-packs', pack).replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));

  await p.goto(file);
  await p.waitForTimeout(800);

  // Play through all questions (pick last option each time).
  for (let guard = 0; guard < 40; guard++) {
    const anyOpt = await p.$('.option:not(:disabled)');
    if (anyOpt) { await anyOpt.click(); await p.waitForTimeout(120); }
    const next = await p.$('#nextBtn');
    const done = await p.$('.big-score');
    if (done) break;
    if (next && !(await next.isHidden())) { await next.click(); await p.waitForTimeout(150); }
  }

  const score = await p.textContent('.big-score').catch(() => 'none');
  console.log('SCORE:', score);

  await p.waitForTimeout(1200); // let sync attempt resolve (no session -> form)
  const hasForm = await p.$('#syncForm');
  const formVisible = hasForm ? await hasForm.isVisible() : false;
  console.log('SIGN-IN FORM VISIBLE:', formVisible);

  // Progress pill should show completion.
  const pill = (await p.textContent('#progressPill')).trim();
  console.log('PROGRESS PILL:', pill);

  // Check a moduleId was baked in (not replace-me).
  const moduleId = await p.evaluate(() => {
    // reach into the closure indirectly: check localStorage key used
    const keys = Object.keys(localStorage);
    return keys;
  });
  console.log('LOCALSTORAGE KEYS:', JSON.stringify(moduleId));

  console.log('\nERRORS:', errors.length ? errors : 'none');
  await b.close();
  console.log(formVisible ? 'SYNC FORM OK' : 'SYNC FORM MISSING (check console)');
})();