#!/usr/bin/env node
/**
 * Taste of Gratitude Funnel Checker
 * Crawls the live site and local repo, flags issues, generates taskfeed entries.
 *
 * Usage:
 *   node scripts/tog-funnel-check.js [--site-url https://tasteofgratitude.shop]
 *
 * Safe: read-only. Does not deploy or mutate production.
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } = require('fs');
const { join, dirname } = require('path');

const SITE_URL = (process.argv.find((a) => a.startsWith('--site-url='))?.split('=')[1] || process.env.TOG_SITE_URL || 'https://tasteofgratitude.shop').replace(/\/$/, '');
const SKIP_LIVE = process.env.TOG_SKIP_LIVE === 'true' || process.argv.includes('--skip-live');
const REPO_ROOT = join(__dirname, '..');
const TASKFEED_DIR = join(REPO_ROOT, 'taskfeed', 'tog');
const TASKS_FILE = join(TASKFEED_DIR, 'tasks.json');
const HISTORY_FILE = join(TASKFEED_DIR, 'history.jsonl');
const DAILY_MD_FILE = join(TASKFEED_DIR, `${new Date().toISOString().slice(0, 10)}.md`);

const OWNER_TIMEZONE = 'America/New_York';

// Banned brand language — exact whole-word matching for single words, exact phrase for multi-word.
const BANNED_SINGLE_WORDS = ['ritual', 'sacred', 'ceremony', 'divine', 'goddess', 'mystical', 'magical'];
const BANNED_PHRASES = [
  'unlock your potential',
  'elevate your wellness journey',
  'transform your life',
  'ancient secret',
  'superfood miracle',
  'detox your body',
  'cleanse toxins',
  'reset your body',
  'feminine energy',
  'high vibration',
  'manifestation',
  'spiritual cleanse',
];

// Risky health/disease claims to flag only in customer-facing ingredient/explore content.
const RISKY_HEALTH_CLAIMS = [
  'cure', 'treats?', 'treating', 'prevent', 'disease',
  'detox', 'detoxify', 'cleanse toxins',
  'immun\\w+ defense', 'immune system support', 'boosts? immunity',
  'inflammation', 'anti-inflammatory',
  'anxiety', 'depression', 'thyroid', 'gut health',
  'pain relief', 'sleep cure', 'blood pressure', 'cholesterol',
  'heart health', 'joint pain', 'nsaids', 'urinary tract',
];

const ROUTES = [
  '/', '/menu', '/weekly-menu', '/catalog', '/quiz', '/markets', '/about',
  '/wholesale', '/contact', '/policies', '/terms', '/privacy', '/faq',
  '/preorder', '/subscriptions/gratitude-box', '/checkout',
];

const PRODUCT_SLUGS = [
  'kissed-by-gods', 'supplemint', 'strawberry-bliss', 'black-minerals',
  'calm-waters', 'peach-lemonade', 'peach-refresher', 'peach-sea-moss-fizz',
  'strawberry-rose-ginger',
];

function nowIso() {
  return new Date().toISOString();
}

function fmtDateEastern() {
  return new Date().toLocaleString('en-US', { timeZone: OWNER_TIMEZONE, dateStyle: 'full', timeStyle: 'short' });
}

function run(cmd, args = [], opts = {}) {
  try {
    const out = execSync(`${cmd} ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`, {
      encoding: 'utf8',
      timeout: 30000,
      ...opts,
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return { ok: false, out: '', err: (e.stderr || e.message || '').trim(), code: e.status || 1 };
  }
}

function httpStatus(route, attempt = 1) {
  const r = run('timeout', ['35', 'curl', '-fsSL', '--connect-timeout', '10', '--max-time', '25', '-o', '/dev/null', '-w', '%{http_code}', `${SITE_URL}${route}`]);
  const code = parseInt(r.out, 10);
  const ok = r.ok && code >= 200 && code < 400;
  if (!ok && attempt < 2) {
    return httpStatus(route, attempt + 1);
  }
  return { ok, code: isNaN(code) ? 0 : code };
}

function fetchHtml(route) {
  const r = run('timeout', ['40', 'curl', '-fsSL', '--connect-timeout', '10', '--max-time', '30', `${SITE_URL}${route}`]);
  return r.ok ? r.out : null;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildBannedPattern() {
  const parts = BANNED_SINGLE_WORDS.map((w) => `\\b${escapeRegExp(w)}\\b`);
  for (const p of BANNED_PHRASES) parts.push(escapeRegExp(p));
  return parts.join('|');
}

const BANNED_PATTERN = buildBannedPattern();

function findInCodebase(pattern, paths = ['app', 'components', 'data', 'lib']) {
  const results = [];
  for (const p of paths) {
    const target = join(REPO_ROOT, p);
    if (!existsSync(target)) continue;
    const r = run('grep', ['-RinHP', pattern, target, '--include=*.js', '--include=*.jsx', '--include=*.ts', '--include=*.tsx']);
    if (r.ok && r.out) {
      for (const line of r.out.split('\n')) {
        if (!line) continue;
        const [file, ...rest] = line.split(':');
        const text = rest.join(':');
        if (file && text) results.push({ file: file.replace(REPO_ROOT + '/', ''), line: text.slice(0, 200) });
      }
    }
  }
  return results;
}

function loadTasks() {
  if (!existsSync(TASKS_FILE)) return { version: 1, project: 'taste-of-gratitude', updatedAt: null, tasks: [] };
  try {
    return JSON.parse(readFileSync(TASKS_FILE, 'utf8'));
  } catch {
    return { version: 1, project: 'taste-of-gratitude', updatedAt: null, tasks: [] };
  }
}

function saveTasks(queue) {
  mkdirSync(dirname(TASKS_FILE), { recursive: true });
  queue.updatedAt = nowIso();
  writeFileSync(TASKS_FILE, JSON.stringify(queue, null, 2) + '\n');
}

function taskId(prefix) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function dedupeAndMerge(queue, newTasks) {
  const existingKeys = new Set(queue.tasks.map((t) => `${t.category}|${t.title}|${t.files_likely_involved?.join(',') || ''}`));
  let added = 0;
  for (const t of newTasks) {
    const key = `${t.category}|${t.title}|${t.files_likely_involved?.join(',') || ''}`;
    if (!existingKeys.has(key)) {
      queue.tasks.push(t);
      existingKeys.add(key);
      added++;
    } else {
      // update last_seen on existing task
      const existing = queue.tasks.find((x) => `${x.category}|${x.title}|${x.files_likely_involved?.join(',') || ''}` === key);
      if (existing) existing.last_seen = t.last_seen;
    }
  }
  return added;
}

function appendHistory(event) {
  mkdirSync(dirname(HISTORY_FILE), { recursive: true });
  appendFileSync(HISTORY_FILE, JSON.stringify(event) + '\n');
}

function buildTask(category, priority, title, evidence, impact, fix, files, effort = 'small') {
  return {
    id: taskId(category),
    created_at: nowIso(),
    last_seen: nowIso(),
    priority,
    category,
    title,
    evidence,
    impact,
    recommended_fix: fix,
    files_likely_involved: Array.isArray(files) ? files : [files],
    estimated_effort: effort,
    approval_required: priority === 'P0' || category === 'compliance' || category === 'copy',
    safe_auto_fix: priority !== 'P0' && category === 'copy' && !title.includes('medical') && !title.includes('price') && !title.includes('checkout'),
    status: 'new',
  };
}

async function main() {
  const findings = [];
  const notes = [];

  // 1. Route health (skip when TOG_SKIP_LIVE=true for faster local repo-only checks)
  if (!SKIP_LIVE) {
    for (const route of ROUTES) {
      const { ok, code } = httpStatus(route);
      if (!ok) {
        findings.push(buildTask('bug', 'P1', `Route ${route} unreachable or slow`, `HTTP ${code || 'timeout'} from ${SITE_URL}${route}`, 'Blocks funnel entry or conversion', 'Investigate backend dependency timeouts (Square/MongoDB) or reduce blocking data fetches', `live:${route}`, 'medium'));
      } else {
        notes.push(`${route}: HTTP ${code}`);
      }
    }

    // 2. Product pages
    for (const slug of PRODUCT_SLUGS) {
      const { ok, code } = httpStatus(`/product/${slug}`);
      if (!ok) {
        findings.push(buildTask('product-page', 'P1', `Product page /product/${slug} unreachable`, `HTTP ${code || 'timeout'}`, 'Product pages are the core conversion surface', 'Check product page data fetching and Square dependencies', `live:/product/${slug}`, 'small'));
      }
    }
  } else {
    notes.push('live checks skipped');
  }

  // 3. Banned brand words in customer-facing code
  const bannedHits = findInCodebase(BANNED_PATTERN, ['app', 'components', 'data'])
    .filter((h) => !h.file.includes('/admin/') && !h.file.includes('node_modules') && !h.file.includes('/api/'));
  const bannedFiles = new Set();
  for (const hit of bannedHits.slice(0, 30)) {
    if (bannedFiles.has(hit.file)) continue;
    bannedFiles.add(hit.file);
    findings.push(buildTask('copy', 'P1', `Banned brand word in ${hit.file.split('/').pop()}`, `Found "${hit.line.trim().slice(0, 80)}..." in ${hit.file}`, 'Weakens authentic founder-led brand voice', 'Replace with approved language per brand lock (routine, practice, weekly batch, support)', hit.file, 'small'));
  }

  // 4. Risky health claims in customer-facing ingredient content only.
  const riskyHits = findInCodebase(RISKY_HEALTH_CLAIMS.join('|'), ['data/ingredients/shared-ingredients.ts', 'lib/ingredient-data-extended.js'])
    .filter((h) => !h.file.includes('/admin/') && !h.line.toLowerCase().includes('disclaimer') && !h.line.toLowerCase().includes('not intended to diagnose') && !h.line.toLowerCase().includes('caution') && !h.line.toLowerCase().includes('healthcare provider'));
  const uniqueFiles = [...new Set(riskyHits.map((h) => h.file))];
  if (uniqueFiles.length) {
    findings.push(buildTask('compliance', 'P0', 'Public content contains risky health/medical claims', `Files: ${uniqueFiles.slice(0, 6).join(', ')}${uniqueFiles.length > 6 ? ` +${uniqueFiles.length - 6} more` : ''}. Examples: cure, prevent, disease, detox, anti-inflammatory, blood pressure.`, 'FDA/FTC compliance risk; ad networks and payment processors may flag medical-sounding claims', 'Rewrite ingredient descriptions to focus on taste, origin, and how the product fits a routine. Remove disease/condition/treatment claims and add a general wellness disclaimer.', uniqueFiles.slice(0, 10), 'large'));
  }

  // 5. Gold gradient / luxury styling (hex codes and explicit gold-gradient classes only)
  const goldPattern = 'D4AF37|#8B7355|#B8860B|gold-gradient';
  const goldHits = findInCodebase(goldPattern, ['components', 'app'])
    .filter((h) => !h.file.includes('/admin/') && !h.file.includes('node_modules'));
  if (goldHits.length) {
    const files = [...new Set(goldHits.map((h) => h.file))].slice(0, 5);
    findings.push(buildTask('trust', 'P1', 'Gold-gradient luxury styling in customer-facing UI', `Found ${goldHits.length} uses of gold/gold-gradient in ${files.join(', ')}`, 'Looks influencer-luxury, not small-batch founder-led', 'Replace gold gradient with emerald/stone palette already used elsewhere', files, 'medium'));
  }

  // 6. Missing product images
  const productsTs = readFileSync(join(REPO_ROOT, 'data', 'products.ts'), 'utf8');
  const missingImages = [];
  // Find each product object that is active on the weekly menu and has a placeholder image.
  const productBlocks = [...productsTs.matchAll(/\{\s*id:[\s\S]*?\n\s*\}/g)];
  for (const block of productBlocks) {
    const text = block[0];
    if (!text.includes('activeWeeklyMenu: true')) continue;
    const imageMatch = text.match(/image:\s*['"]([^'"]+)['"]/);
    const nameMatch = text.match(/name:\s*['"]([^'"]+)['"]/);
    const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
    const image = imageMatch?.[1] || '';
    if (image.includes('sea-moss-default.svg') || image.includes('placeholder')) {
      missingImages.push({ slug: slugMatch?.[1] || 'unknown', name: nameMatch?.[1] || 'unknown', image });
    }
  }
  if (missingImages.length) {
    findings.push(buildTask('product-page', 'P1', `${missingImages.length} weekly menu items use default placeholder image`, `Items: ${missingImages.map((i) => i.name).join(', ')}`, 'Placeholder SVG hurts trust and conversion on menu/product cards', 'Photograph or source product images and update data/products.ts image URLs', 'data/products.ts', 'medium'));
  }

  // 7. Weekly menu date range
  const weeklyMenuTs = readFileSync(join(REPO_ROOT, 'data', 'weeklyMenu.ts'), 'utf8');
  if (!weeklyMenuTs.match(/week_start|week_end|weekStart|weekEnd|dateRange/)) {
    findings.push(buildTask('menu', 'P1', 'Static weekly menu has no visible date range', 'WEEKLY_MENU in data/weeklyMenu.ts lacks week_start/week_end; customers cannot confirm freshness', 'Stale-looking menu reduces urgency and trust', 'Add week_start, week_end, and display them on /weekly-menu and /', ['data/weeklyMenu.ts', 'components/weekly-menu/WeeklyMenuPage.tsx', 'app/weekly-menu/page.tsx'], 'small'));
  }

  // 8. /menu should redirect to canonical /weekly-menu (already implemented)
  // No longer flagged as P0 because app/menu/page.tsx now server-redirects to /weekly-menu.

  // 9. Telegram / env
  const envExample = readFileSync(join(REPO_ROOT, '.env.example'), 'utf8');
  if (!envExample.includes('TELEGRAM_BOT_TOKEN')) {
    findings.push(buildTask('analytics', 'P2', 'TELEGRAM_BOT_TOKEN missing from .env.example', 'Telegram notifier cannot be configured without documented env vars', 'Blocks owner alerts and menu-intake workflow', 'Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env.example and Vercel', '.env.example', 'small'));
  }

  // 10. Lockfile
  const hasLockfile = existsSync(join(REPO_ROOT, 'package-lock.json')) || existsSync(join(REPO_ROOT, 'pnpm-lock.yaml')) || existsSync(join(REPO_ROOT, 'yarn.lock'));
  if (!hasLockfile) {
    findings.push(buildTask('bug', 'P2', 'No package lockfile in repo', 'No package-lock.json, pnpm-lock.yaml, or yarn.lock present', 'Non-deterministic installs in CI/Vercel', 'Regenerate lockfile with the active package manager and commit it', 'package.json', 'small'));
  }

  // Persist
  const queue = loadTasks();
  const added = dedupeAndMerge(queue, findings);
  saveTasks(queue);

  const event = {
    t: nowIso(),
    type: 'tog_funnel_check',
    siteUrl: SITE_URL,
    routeNotes: notes,
    generated: findings.length,
    added,
    openTasks: queue.tasks.filter((t) => t.status === 'new' || t.status === 'approved').length,
  };
  appendHistory(event);

  // Daily markdown digest
  const lines = [
    `# Taste of Gratitude Funnel Digest — ${new Date().toLocaleDateString('en-US', { timeZone: OWNER_TIMEZONE, weekday: 'long', month: 'short', day: 'numeric' })}`,
    '',
    `Site: ${SITE_URL}  `,
    `Checked at: ${fmtDateEastern()}  `,
    `Routes OK: ${notes.length} / ${ROUTES.length}  `,
    `New tasks generated: ${findings.length}  `,
    `New tasks added: ${added}  `,
    `Total open tasks: ${event.openTasks}  `,
    '',
    '## P0 — Urgent',
    ...findings.filter((t) => t.priority === 'P0').map((t) => `- **${t.title}**  \n  Evidence: ${t.evidence}  \n  Fix: ${t.recommended_fix}`),
    '',
    '## P1 — Conversion / brand',
    ...findings.filter((t) => t.priority === 'P1').map((t) => `- **${t.title}**  \n  Evidence: ${t.evidence}  \n  Fix: ${t.recommended_fix}`),
    '',
    '## P2 — Infrastructure',
    ...findings.filter((t) => t.priority === 'P2').map((t) => `- **${t.title}**  \n  Evidence: ${t.evidence}  \n  Fix: ${t.recommended_fix}`),
    '',
    '## P3 — Polish',
    ...findings.filter((t) => t.priority === 'P3').map((t) => `- **${t.title}**  \n  Evidence: ${t.evidence}  \n  Fix: ${t.recommended_fix}`),
    '',
    '## Safe notes',
    ...notes.map((n) => `- ${n}`),
  ];
  writeFileSync(DAILY_MD_FILE, lines.join('\n') + '\n');

  console.log(`Taste of Gratitude funnel check complete.`);
  console.log(`  Routes OK: ${notes.length}/${ROUTES.length}`);
  console.log(`  New tasks generated: ${findings.length}`);
  console.log(`  New tasks added: ${added}`);
  console.log(`  Total open tasks: ${event.openTasks}`);
  console.log(`  Files: ${TASKS_FILE}, ${HISTORY_FILE}, ${DAILY_MD_FILE}`);
}

main().catch((err) => {
  console.error('Funnel check failed:', err.message);
  process.exit(1);
});
