// Quick check: networking course modules 18-26 all show a study-pack link.
const { chromium } = require('@playwright/test');

(async () => {
  const b = await chromium.launch({ headless: true });
  const s = await b.newPage();
  await s.goto('http://localhost:4173/login.html', { waitUntil: 'domcontentloaded' });
  await s.fill('#email', 'rajbabna@gmail.com');
  await s.fill('#password', '@student1176');
  await s.click('#loginBtn');
  await s.waitForURL(/student-dashboard\.html/, { timeout: 20000 });
  await s.goto('http://localhost:4173/course.html?course=networking', { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(8000);
  const links = await s.$$eval('a[href*="study-packs/"]', els => els.map(a => a.getAttribute('href')));
  console.log('NETWORKING PACK LINKS (' + links.length + '):');
  links.forEach(l => console.log('  -', l));
  const mods = await s.$$eval('li[data-module-id]', els => els.map(e => ({
    id: e.getAttribute('data-module-id'),
    hasPack: !!e.querySelector('a[href*="study-packs/"]')
  })));
  console.log('\nPER MODULE:');
  mods.forEach(m => console.log('  id=' + m.id + ' pack=' + m.hasPack));
  await b.close();
})();