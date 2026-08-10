// Live-app inventory v2: logs in as admin, scans both course pages for module
// cards (id / content type / quiz link) and the Analytics quiz-scores section.
// Read-only. Run: node tests/lib/inventory.js
const { chromium } = require('@playwright/test');
const { env } = require('./env');

const BASE = process.env.LMS_BASE_URL || 'https://rajbabna.github.io/LMS-CableNet';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const report = { base: BASE, courses: {}, tabs: [], analyticsQuiz: null };

  await page.goto(BASE + '/login.html', { waitUntil: 'domcontentloaded' });
  await page.fill('#email', env.adminEmail);
  await page.fill('#password', env.adminPass);
  await page.click('#loginBtn');
  await page.waitForURL(/instructor-dashboard\.html/, { timeout: 20000 });
  console.log('LOGIN OK');

  const tabs = await page.$$eval('[data-tab]', els => els.map(e => e.getAttribute('data-tab')));
  report.tabs = tabs;
  console.log('\nTABS:', tabs.join(', '));

  // Course pages
  for (const url of ['/course.html?course=cabling', '/course.html?course=networking']) {
    try {
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
      const mods = await page.$$eval('[data-module-id]', els =>
        els.map(e => ({
          id: e.getAttribute('data-module-id'),
          type: ((e.querySelector('.mod-type-badge') || {}).textContent || '').trim(),
          title: ((e.querySelector('.module-card-title') || {}).textContent || '').trim(),
          status: ((e.querySelector('.mod-status') || {}).textContent || '').trim(),
          hasQuiz: !!e.querySelector('.module-quiz-cq'),
          quizLabel: ((e.querySelector('.cq-label') || {}).textContent || '').trim()
        }))
      );
      report.courses[url] = mods;
      console.log(`\n${url} MODULES (${mods.length}):`);
      mods.forEach(m => console.log(` - ${m.id} [${m.type}] ${m.title} (${m.status}) ${m.hasQuiz ? 'QUIZ:' + m.quizLabel : ''}`));
    } catch (e) { console.log('scan failed', url, e.message); }
  }

  // Analytics tab quiz section
  try {
    await page.goto(BASE + '/instructor-dashboard.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const aTab = page.locator('[data-tab="analytics"]');
    if (await aTab.count()) {
      await aTab.click();
      await page.waitForTimeout(4000);
      const quizSection = await page.$$eval('[id*="quiz"],[data-zone="quizscores"],.quiz-scores', els =>
        els.map(e => ({ id: e.id || '', text: (e.textContent || '').trim().slice(0, 200) }))
      );
      report.analyticsQuiz = quizSection;
      console.log('\nANALYTICS QUIZ ZONE:', JSON.stringify(quizSection.map(z => z.id)));
      const quizText = await page.evaluate(() => {
        const els = [...document.querySelectorAll('*')].filter(e => /\bQuiz Scores\b/i.test((e.childElementCount === 0 ? e.textContent : '') || ''));
        return els.slice(0, 3).map(e => e.textContent.trim().slice(0, 150));
      });
      if (quizText.length) {
        console.log('  Quiz Scores text present:', quizText.join(' | '));
        report.analyticsQuizText = quizText;
      }
    }
  } catch (e) { console.log('analytics scan failed:', e.message); }

  await browser.close();
  require('fs').writeFileSync(require('path').join(__dirname, 'inventory-output.json'), JSON.stringify(report, null, 2));
  console.log('\nDONE -> tests/lib/inventory-output.json');
})();