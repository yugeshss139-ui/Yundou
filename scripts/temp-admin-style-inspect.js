const { chromium } = require('playwright');

const ADMIN_URL = 'https://yundo-5rpw8s6sl-yugeshss139-uis-projects.vercel.app/admin';
const PLAYLISTS_URL = 'https://yundo-5rpw8s6sl-yugeshss139-uis-projects.vercel.app/playlists';

async function inspect(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[console error]', msg.text());
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const result = await page.evaluate(() => {
    const styleSheets = Array.from(document.styleSheets).map((s) => {
      try {
        return { href: s.href || null, rules: (s.cssRules ? s.cssRules.length : null) };
      } catch (e) {
        return { href: s.href || null, rules: 'blocked' };
      }
    });

    const pickText = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return {
        className: el.className,
        tag: el.tagName,
        computed: window.getComputedStyle(el),
      };
    };

    const adminLayout = pickText('.admin-layout');
    const adminPage = pickText('.admin-page');
    const adminSidebar = pickText('.admin-sidebar');

    const getComputed = (computed, keys) => {
      const out = {};
      for (const k of keys) out[k] = computed[k];
      return out;
    };

    const keys = ['display','backgroundColor','borderTopWidth','borderTopStyle','borderTopColor','padding','marginLeft','marginTop'];

    const computedAdminLayout = adminLayout ? getComputed(adminLayout.computed, keys) : null;
    const computedAdminPage = adminPage ? getComputed(adminPage.computed, keys) : null;
    const computedAdminSidebar = adminSidebar ? getComputed(adminSidebar.computed, keys) : null;

    const getMatchingRulesForSelector = (selector) => {
      const matches = [];
      for (const s of document.styleSheets) {
        let rules;
        try { rules = s.cssRules; } catch { continue; }
        if (!rules) continue;
        for (const r of rules) {
          try {
            if (r.selectorText && r.selectorText.includes(selector.replace('.', ''))) {
              matches.push({ selectorText: r.selectorText, style: (r.style && r.style.cssText) || null });
            }
          } catch {}
        }
      }
      return matches.slice(0, 50);
    };

    const adminLayoutRules = getMatchingRulesForSelector('.admin-layout');
    const adminPageRules = getMatchingRulesForSelector('.admin-page');
    const adminSidebarRules = getMatchingRulesForSelector('.admin-sidebar');

    return {
      url: location.href,
      title: document.title,
      hasAdminLayout: !!document.querySelector('.admin-layout'),
      hasAdminPage: !!document.querySelector('.admin-page'),
      hasAdminSidebar: !!document.querySelector('.admin-sidebar'),
      classNames: {
        adminLayout: document.querySelector('.admin-layout')?.className || null,
        adminPage: document.querySelector('.admin-page')?.className || null,
        adminSidebar: document.querySelector('.admin-sidebar')?.className || null,
      },
      stylesheetHrefs: styleSheets.filter((s) => s.href).map((s) => s.href),
      stylesheetAdmin: styleSheets.filter((s) => (s.href || '').includes('Admin.css') || (s.href || '').includes('admin') || (s.href || '').includes('Admin')).map((s) => s.href),
      computed: {
        adminLayout: computedAdminLayout,
        adminPage: computedAdminPage,
        adminSidebar: computedAdminSidebar,
      },
      sampleRules: {
        adminLayoutRules,
        adminPageRules,
        adminSidebarRules,
      },
    };
  });

  await browser.close();
  return result;
}

(async () => {
  const admin = await inspect(ADMIN_URL);
  console.log('--- ADMIN INSPECTION ---');
  console.log(JSON.stringify(admin, null, 2));

  const playlists = await inspect(PLAYLISTS_URL);
  console.log('--- PLAYLISTS INSPECTION ---');
  console.log(JSON.stringify(playlists, null, 2));
})();
