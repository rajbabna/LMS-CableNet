// Validates a generated study pack end-to-end (notes, quiz, localStorage).
const { chromium } = require('@playwright/test');
const path = require('path');

const packs = process.argv[2]
  ? [process.argv[2]]
  : ['cabling-module-01.html', 'networking-module-09.html'];

(async () => {
  const b = await chromium.launch({ headless: true });
  let allOk = true;

  for (const pack of packs) {
    const p = await b.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    const file = 'file:///' + path.resolve(__dirname, '../../tools/study-packs', pack).replace(/\\/g, '/');
    await p.goto(file);
    await p.waitForTimeout(400);

    const title = (await p.textContent('#packTitle')).trim();
    const meta = (await p.textContent('#packMeta')).trim();
    const notes = (await p.textContent('#notesBody')).replace(/\s+/g, ' ').trim().slice(0, 100);
    const qCount = await p.locator('.option').count();
    console.log(`\n[${pack}]`);
    console.log(`  TITLE: ${title}`);
    console.log(`  META: ${meta}`);
    console.log(`  NOTES: ${notes.length ? notes : '(empty)'}`);
    console.log(`  Q1 OPTIONS: ${qCount}`);

    // Play through: pick option 0 each time until results show.
    for (let guard = 0; guard < 30; guard++) {
      const next = await p.$('#nextBtn');
      const hasResults = await p.$('.big-score');
      if (hasResults) break;
      const anyOpt = await p.$('.option:not(:disabled)');
      if (anyOpt) {
        await anyOpt.click();
        await p.waitForTimeout(120);
      }
      if (next && !(await next.isHidden())) {
        await next.click();
        await p.waitForTimeout(120);
      } else break;
    }
    const score = await p.textContent('.big-score').catch(() => 'no-score');
    const storage = await p.evaluate(() => localStorage.getItem('study-pack:replace-me') || localStorage.length);
    console.log(`  FINAL SCORE: ${score}`);
    console.log(`  STORAGE KEYS: ${storage}`);

    if (errors.length) { allOk = false; console.log('  PAGE ERRORS:', errors); }
    if (title.includes('replace-me') || meta.includes('replace-me') || notes.includes('replace with')) {
      allOk = false; console.log('  !!! placeholder data leaked into pack');
    }
    await p.close();
  }

  await b.close();
  console.log(allOk ? '\nALL PACKS OK' : '\nISSUES FOUND');
})();