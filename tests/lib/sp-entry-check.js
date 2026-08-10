// Verifies a study-pack link renders on the course page for modules 1-9
// and absent for demo modules (module_number 11-14).
const { chromium } = require('@playwright/test');
const { env } = require('./env');

const BASE = process.env.LMS_BASE_URL || 'http://localhost:4173';

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));

  await p.goto(BASE + '/login.html', { waitUntil: 'domcontentloaded' });
  await p.fill('#email', env.adminEmail);
  await p.fill('#password', env.adminPass);
  await p.click('#loginBtn');
  await p.waitForURL(/instructor-dashboard\.html/, { timeout: 20000 });

  const stu = { email: 'rajbabna@gmail.com', pass: '@student1176' };
  const s = await b.newPage();
  await s.goto(BASE + '/login.html', { waitUntil: 'domcontentloaded' });
  await s.fill('#email', stu.email);
  await s.fill('#password', stu.pass);
  await s.click('#loginBtn');
  await s.waitForURL(/student-dashboard\.html/, { timeout: 20000 });

  await s.goto(BASE + '/course.html?course=cabling', { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(8000);
  const links = await s.$$eval('a[href*="study-packs/"]', els => els.map(a => a.getAttribute('href')));
  console.log('STUDY PACK LINKS on cabling (' + links.length + '):');
  links.forEach(l => console.log('  -', l));

  // Verify the first module links resolve (HTTP 200 in-page).
  const ok = [];
  for (const href of links.slice(0, 9)) {
    const r = await s.evaluate(async (u) => {
      const res = await fetch(u);
      return res.ok;
    }, href);
    ok.push({ href, ok: r });
  }
  console.log('\nResolvable:', JSON.stringify(ok));

  // Confirm demo modules (video/pdf/tool/article, module_number 11-14) do NOT
  // get a pack link: count cards with study-pack link vs total.
  const mods = await s.$$eval('li[data-module-id]', els => els.map(e => ({
    id: e.getAttribute('data-module-id'),
    type: ((e.querySelector('.mod-type-badge') || {}).textContent || '').trim(),
    hasPack: !!e.querySelector('a[href*="study-packs/"]')
  })));
  console.log('\nPer-module pack presence:');
  mods.forEach(m => console.log(`  id=${m.id} [${m.type}] pack=${m.hasPack}`));
  console.log('\nJS ERRORS:', errors.length ? errors : 'none');
  await b.close();
})();