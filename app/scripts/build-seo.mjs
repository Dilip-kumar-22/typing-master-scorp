#!/usr/bin/env node
// SEO build step — runs AFTER `vite build`.
//
// Generates static landing pages alongside the SPA bundle so search engines
// can index real content. Each lesson, the adaptive page, and the challenges
// page get their own indexable HTML with unique <title>, meta description,
// Open Graph cards, Twitter cards, and Schema.org Course markup. The CTA
// on each page deep-links into the SPA via ?lesson=ID — the SPA reads that
// query param and pre-picks the right mode.
//
// Also writes sitemap.xml and robots.txt at the root of dist/.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS, CHALLENGES } from './lessons-cjs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

// ─── CONFIG ────────────────────────────────────────────────
// Replace this with your real production URL before deploy. For GitHub Pages
// this is just the ORIGIN (e.g. https://dilip-kumar-22.github.io); the subpath
// is handled by BASE below.
const SITE = process.env.SITE_URL || 'https://typingmaster.example.com';
const APP_NAME = 'Typing Master · S-Corp';
const APP_DESC = 'Premium touch-typing tutor with a 40-chapter curriculum, keybr-style adaptive learning, real-time multiplayer, and a 3D mechanical-keyboard heatmap. Free to use, no signup required.';

// Pull out the SPA-built CSS/JS asset filenames so the landing pages share the
// same bundle. The regex is base-agnostic (`[^"]*` before /assets/) so it works
// whether the build used base '/' or a GitHub Pages subpath.
const spaHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
const cssMatch = spaHtml.match(/href="([^"]*\/assets\/index-[^"]+\.css)"/);
const jsMatch  = spaHtml.match(/src="([^"]*\/assets\/index-[^"]+\.js)"/);
const CSS_HREF = cssMatch?.[1] || '/assets/index.css';
const JS_SRC   = jsMatch?.[1]  || '/assets/index.js';

// vite-plugin-pwa injects a <script src=".../registerSW.js"> into the SPA
// index.html. We rebuild index.html (and every SEO sub-page) from scratch
// below, so we must carry that registration script over — otherwise the
// service worker never registers on the deployed site and the PWA is NOT
// installable / offline-capable. Pull whatever path vite emitted (base-aware).
const swRegMatch = spaHtml.match(/src="([^"]*registerSW\.js)"/);
const SW_REG_SRC = swRegMatch?.[1] || null;

// Derive the public BASE path straight from Vite's own output (the asset href
// above), so the SEO pages always agree with the actual bundle. This is the
// single source of truth — no env var, immune to Git-Bash/Windows path
// mangling. '/' for root deploys, '/typing-master-scorp/' for GH Pages.
const baseMatch = (CSS_HREF || JS_SRC).match(/^(.*\/)assets\//);
const BASE = baseMatch ? baseMatch[1] : '/';

// ─── HELPERS ───────────────────────────────────────────────
function ensureDir(p) { mkdirSync(p, { recursive: true }); }
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Turn an internal absolute path ('/', '/lessons/', '/?lesson=x') into a
// base-aware href. With BASE='/' it's an identity; with a subpath it prefixes.
function href(p) {
  if (p === '/') return BASE;
  return BASE.replace(/\/$/, '') + p;
}

function pageShell({ path, title, description, ogType = 'website', schema, body, deepLink }) {
  const url = SITE + href(path);
  const ogImg = SITE + href('/icon.svg');
  const canonical = url;
  const cta = deepLink ? `<a class="seo-cta" href="${esc(href(deepLink))}">Start practicing →</a>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#07071a" />

  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:site_name" content="${esc(APP_NAME)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:image" content="${esc(ogImg)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImg)}" />

  ${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}

  <link rel="icon" href="${esc(href('/icon.svg'))}" type="image/svg+xml" />
  <link rel="manifest" href="${esc(href('/manifest.webmanifest'))}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${esc(CSS_HREF)}" />

  <!-- Hand-off the deep-link to the SPA bundle via the page URL ?lesson= param. -->
  <script type="module" src="${esc(JS_SRC)}"></script>
  ${SW_REG_SRC ? `<!-- PWA service-worker registration (carried over from vite-plugin-pwa) -->
  <script src="${esc(SW_REG_SRC)}"></script>` : ''}
</head>
<body class="theme-dark accent-violet cursor-line">
  <div class="bg-layer"></div>
  <div class="bg-grid"></div>
  <div class="bg-grain"></div>
  <div class="bg-orb a"></div>
  <div class="bg-orb b"></div>
  <div class="bg-orb c"></div>

  <!-- Crawler-friendly content. This becomes invisible the moment the SPA
       mounts into #app below it, but search engines see it on first fetch. -->
  <main class="seo-page" aria-hidden="false">
    ${body}
    ${cta}
    <nav class="seo-foot">
      <a href="${esc(href('/'))}">Home</a> · <a href="${esc(href('/lessons/'))}">All lessons</a> · <a href="${esc(href('/adaptive/'))}">Adaptive</a> · <a href="${esc(href('/challenges/'))}">Challenges</a>
    </nav>
  </main>

  <div id="app"></div>
</body>
</html>
`;
}

// ─── PAGE BUILDERS ─────────────────────────────────────────

function lessonPage(lesson, index) {
  const path = `/lessons/chapter-${index + 1}/`;
  const title = `${lesson.title} — ${APP_NAME}`;
  const description = lesson.instructions + ' Free interactive typing lesson with finger guides, heatmaps, and live WPM.';
  const guideHtml = (lesson.guide || [lesson.instructions])
    .map(p => `<p>${esc(p)}</p>`).join('');
  const tipHtml = lesson.tip
    ? `<aside class="seo-tip"><strong>Pro tip:</strong> ${esc(lesson.tip)}</aside>`
    : '';
  const deepLink = `/?lesson=${encodeURIComponent(lesson.id)}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: lesson.title,
    description: lesson.instructions,
    provider: { '@type': 'Organization', name: 'S-Corp', url: SITE },
    inLanguage: 'en',
    educationalLevel: 'beginner',
    teaches: 'Touch typing',
    isAccessibleForFree: true,
  };
  const body = `
    <a class="seo-eyebrow" href="${esc(href('/lessons/'))}">← All lessons</a>
    <h1>${esc(lesson.title)}</h1>
    <p class="seo-sub">${esc(lesson.subtitle)} · Active keys: <code>${esc(lesson.keys.replace(/ /g, '␣'))}</code></p>
    <div class="seo-body">${guideHtml}${tipHtml}</div>`;
  return { path, html: pageShell({ path, title, description, ogType: 'article', schema, body, deepLink }) };
}

function lessonsIndexPage() {
  const path = '/lessons/';
  const title = `All 40 lessons — ${APP_NAME}`;
  const description = 'A free 40-chapter touch-typing curriculum: home row, top row, bottom row, capitals, numbers, symbols, speed drills, and real-world fluency. Each lesson includes a guided tutorial and live finger heatmaps.';
  const items = LESSONS.map((l, i) => `
    <li>
      <a href="${esc(href(`/lessons/chapter-${i + 1}/`))}">
        <strong>${esc(l.title)}</strong>
        <span class="seo-meta">${esc(l.subtitle)} · keys: ${esc(l.keys.trim()) || '—'}</span>
      </a>
    </li>`).join('');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: LESSONS.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: l.title,
      url: SITE + href(`/lessons/chapter-${i + 1}/`),
    })),
  };
  const body = `
    <h1>The full touch-typing curriculum</h1>
    <p class="seo-sub">40 chapters, ordered for progressive muscle-memory build-up. Free, no signup, works offline after install.</p>
    <ul class="seo-list">${items}</ul>`;
  return { path, html: pageShell({ path, title, description, schema, body, deepLink: '/' }) };
}

function adaptivePage() {
  const path = '/adaptive/';
  const title = `Adaptive typing practice — ${APP_NAME}`;
  const description = 'Keybr-style adaptive typing trainer. Letters unlock as you hit your target WPM. The algorithm picks what you need to practice next, weighting prompts toward your weakest keys.';
  const body = `
    <h1>Adaptive learning, modeled on keybr.com</h1>
    <p class="seo-sub">Letters unlock as you reach your target speed. The newest letter gets extra practice. Pure flow — no menus, no chapters.</p>
    <p>You start with 3 letters (E, T, A). When all three are mastered (default: 25 WPM, ≥90% accuracy on a rolling sample window), the next letter — O — unlocks. Then I, then N, and so on through all 26.</p>
    <p>Real English words from a built-in dictionary fill each round whenever your unlocked set can spell them, with weighted preference for words containing the newest-unlocked letter so it gets the most reps.</p>`;
  return { path, html: pageShell({ path, title, description, body, deepLink: '/?mode=adaptive' }) };
}

function pricingPage() {
  const path = '/pricing/';
  const title = `Pricing — Free, Pro, and Team plans · ${APP_NAME}`;
  const description = 'Free forever for the core 40-chapter curriculum, adaptive learning, and multiplayer. Pro ($5/mo) unlocks custom paragraph paste, advanced analytics, and unlimited room size. Team plans for classrooms and companies.';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: APP_NAME,
    description: APP_DESC,
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'Pro', price: '5', priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '5', priceCurrency: 'USD', unitText: 'MONTH' } },
      { '@type': 'Offer', name: 'Team', price: '3', priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '3', priceCurrency: 'USD', unitText: 'MONTH' } },
    ],
  };
  const body = `
    <h1>Simple pricing. Free forever for the core.</h1>
    <p class="seo-sub">Use the full 40-chapter curriculum, adaptive learning, and multiplayer at no cost. Upgrade when you want power-user features.</p>
    <ul class="seo-list">
      <li><strong>Free — $0</strong>: 40-chapter curriculum, adaptive learning, multiplayer (up to 2 players), local progress + optional cloud sync.</li>
      <li><strong>Pro — $5/mo or $50/yr</strong>: Everything in Free + custom paragraph paste, advanced per-key analytics, unlimited multiplayer room size, premium themes.</li>
      <li><strong>Team — $3/seat/mo (min 10)</strong>: Everything in Pro + teacher dashboard, class leaderboards, bulk seat management, priority support.</li>
    </ul>`;
  return { path, html: pageShell({ path, title, description, schema, body, deepLink: '/?mode=pricing' }) };
}

function challengesPage() {
  const path = '/challenges/';
  const title = `Speed & accuracy challenges — ${APP_NAME}`;
  const description = 'Daily seeded challenges, paragraph speed-runs, punctuation drills, and code-typing micro-tests. Compete on the global leaderboard.';
  const items = CHALLENGES.map(c => `<li><strong>${esc(c.label)}</strong> — ${esc(c.desc)}</li>`).join('');
  const body = `
    <h1>Elite speed &amp; accuracy challenges</h1>
    <p class="seo-sub">Push your real-world WPM with curated test runs.</p>
    <ul class="seo-list">${items}</ul>`;
  return { path, html: pageShell({ path, title, description, body, deepLink: '/?mode=challenges' }) };
}

function homePage() {
  const path = '/';
  const title = `${APP_NAME} — Free Touch-Typing Trainer with 3D Keyboard`;
  const description = APP_DESC;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: APP_NAME,
    description: APP_DESC,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    inLanguage: 'en',
  };
  const body = `
    <h1>Train your fingers. Sharpen your mind.</h1>
    <p class="seo-sub">Free interactive touch-typing tutor with a 40-chapter curriculum, keybr-style adaptive learning, real-time multiplayer races, and a 3D mechanical-keyboard heatmap.</p>
    <ul class="seo-list">
      <li><a href="${esc(href('/lessons/'))}"><strong>40-chapter curriculum</strong></a> — home row → top row → bottom row → capitals → numbers → symbols → speed drills</li>
      <li><a href="${esc(href('/adaptive/'))}"><strong>Adaptive practice</strong></a> — letters unlock as you master them, keybr.com style</li>
      <li><a href="${esc(href('/challenges/'))}"><strong>Challenges</strong></a> — daily runs, paragraphs, code drills</li>
      <li><strong>3D keyboard heatmap</strong> — see which keys you hit most and which you miss</li>
      <li><strong>Real-time multiplayer races</strong> — head-to-head WPM with friends via room codes</li>
      <li><strong>Cloud sync + leaderboard</strong> (optional) — sign in to back up progress and climb the global board</li>
    </ul>`;
  // Important — the home shell does NOT include a CTA <a>, because the body
  // content IS the landing for the app's home view. The SPA mount below
  // takes over immediately on JS load.
  return { path, html: pageShell({ path, title, description, schema, body }) };
}

// ─── WRITE ALL THE PAGES ──────────────────────────────────

function writePage({ path, html }) {
  const dirPath = join(DIST, path);
  ensureDir(dirPath);
  writeFileSync(join(dirPath, 'index.html'), html, 'utf8');
}

const pages = [
  homePage(),
  lessonsIndexPage(),
  adaptivePage(),
  challengesPage(),
  pricingPage(),
  ...LESSONS.map((l, i) => lessonPage(l, i)),
];

for (const p of pages) {
  // Special-case: the home page IS index.html, not home/index.html.
  if (p.path === '/') {
    writeFileSync(join(DIST, 'index.html'), p.html, 'utf8');
  } else {
    writePage(p);
  }
}

// sitemap.xml ─────────────────────────────────────────────
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${SITE}${href(p.path)}</loc>
    <changefreq>${p.path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${p.path === '/' ? '1.0' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8');

// robots.txt ──────────────────────────────────────────────
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *
Allow: /
Disallow: ${href('/assets/')}
Sitemap: ${SITE}${href('/sitemap.xml')}
`, 'utf8');

// ─── DEPLOY-TARGET FIXUPS ─────────────────────────────────
// These make the build work on GitHub Pages (and are harmless at root).

// 1. Rewrite the PWA manifest's start_url/scope/icons to the BASE so the
//    installed app launches correctly under a subpath. The manifest in public/
//    is authored for root; here we patch the COPY in dist/.
try {
  const manifestPath = join(DIST, 'manifest.webmanifest');
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  m.start_url = href('/');
  m.scope = href('/');
  if (Array.isArray(m.icons)) {
    m.icons = m.icons.map(ic => ({ ...ic, src: ic.src.startsWith('http') ? ic.src : href(ic.src.replace(/^\//, '/')) }));
  }
  writeFileSync(manifestPath, JSON.stringify(m, null, 2), 'utf8');
} catch (e) {
  console.warn('  ! Could not patch manifest for BASE:', e.message);
}

// 2. SPA fallback for client-side deep links on GitHub Pages. Pages serves
//    404.html for unknown paths; copying index.html there makes refreshes /
//    direct visits to in-app routes load the SPA instead of a 404. (We ship the
//    home shell, which boots the SPA and reads any ?query deep-link.)
try {
  copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));
} catch (e) {
  console.warn('  ! Could not write 404.html fallback:', e.message);
}

// 3. .nojekyll — stop GitHub Pages' Jekyll from ignoring files/dirs that start
//    with an underscore (Vite can emit such asset names) and from any
//    unexpected processing. A zero-byte marker file is all that's needed.
try {
  writeFileSync(join(DIST, '.nojekyll'), '', 'utf8');
} catch (e) {
  console.warn('  ! Could not write .nojekyll:', e.message);
}

console.log(`✓ Wrote ${pages.length} SEO pages + sitemap.xml + robots.txt`);
console.log(`  Base path: ${BASE}`);
console.log(`  Site URL: ${SITE} (override with SITE_URL env var)`);
console.log(`  + manifest patched, 404.html fallback, .nojekyll`);
