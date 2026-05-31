#!/usr/bin/env node
/**
 * Route coverage check.
 *
 * Crawls the source tree for *visible* references to internal routes:
 *   - <Link href="..."> / <Link to="...">
 *   - <a href="...">
 *   - router.push("...") / router.replace("...")
 *   - fetch("/api/...") and api(...) wrappers
 *   - server-side `redirect("/...")` calls
 *
 * Compares the set against the actual filesystem routes exposed by the
 * Next.js app router ('app/**•/route.{ts,js,tsx,jsx}' and
 * 'app/**•/page.{tsx,jsx,js}'). Any reference to a route that the app does
 * not implement is reported as a coverage gap UNLESS the path is in
 * `_route-coverage-allowlist.json`.
 *
 * Exits non-zero on uncovered references so CI can block deploys with
 * dead CTAs.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const ALLOWLIST_PATH = path.join(__dirname, '_route-coverage-allowlist.json');

const SOURCE_GLOBS = [
  'app',
  'components',
  'lib',
  'pages', // legacy, ignored if absent
];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const IGNORE_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'coverage', '.git', '.vorax',
  '.voracious-diagnostics', '__tests__', 'tests',
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (EXTS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

// --- Discover routes implemented by the app router ---------------------------
function discoverImplementedRoutes() {
  const apiRoutes = new Set();
  const pageRoutes = new Set();
  if (!fs.existsSync(APP_DIR)) return { apiRoutes, pageRoutes };

  walk(APP_DIR).forEach((file) => {
    const rel = path.relative(APP_DIR, file).replace(/\\/g, '/');
    // route.{ts,js,tsx,jsx}
    if (/(^|\/)route\.(ts|js|tsx|jsx)$/.test(rel)) {
      const stripped = rel
        .replace(/(^|\/)route\.(ts|js|tsx|jsx)$/, '')
        // Group segments like (app) and (marketing) don't affect URL.
        .replace(/\(([^)]+)\)\/?/g, '')
        .replace(/^\/+|\/+$/g, '');
      const norm = stripped === '' ? '/' : '/' + stripped;
      apiRoutes.add(normalizeRoute(norm));
    }
    // page.{tsx,jsx,js}
    if (/(^|\/)page\.(tsx|jsx|js)$/.test(rel)) {
      const stripped = rel
        .replace(/(^|\/)page\.(tsx|jsx|js)$/, '')
        .replace(/\(([^)]+)\)\/?/g, '')
        .replace(/^\/+|\/+$/g, '');
      const norm = stripped === '' ? '/' : '/' + stripped;
      pageRoutes.add(normalizeRoute(norm));
    }
  });

  return { apiRoutes, pageRoutes };
}

// Normalize dynamic segments [foo] -> :foo for matching.
function normalizeRoute(r) {
  return r
    .replace(/\[(\.\.\.)?([^\]]+)\]/g, ':$2')
    .replace(/\/+$/, '')
    || '/';
}

// --- Extract route references from sources -----------------------------------
const REFERENCE_PATTERNS = [
  // href="/some/path" or href='/some/path'
  /\bhref\s*=\s*["'`](\/(?!\/)[^"'`?#\s]*)/g,
  // <Link to="/...">
  /\bto\s*=\s*["'`](\/(?!\/)[^"'`?#\s]*)/g,
  // router.push("/...") / .replace("/...")
  /\brouter\.(?:push|replace)\(\s*["'`](\/(?!\/)[^"'`?#\s]*)/g,
  // redirect("/...")
  /\bredirect\(\s*["'`](\/(?!\/)[^"'`?#\s]*)/g,
  // fetch("/api/...") with optional template literals
  /\bfetch\(\s*[`"']((?:\/|\/api\/)[^`"'?#\s]*)/g,
  // axios.get/post/etc
  /\baxios\.(?:get|post|put|delete|patch)\(\s*["'`](\/(?!\/)[^"'`?#\s]*)/g,
];

function extractReferences(file) {
  const src = fs.readFileSync(file, 'utf8');
  const refs = new Set();
  for (const pattern of REFERENCE_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(src))) {
      let p = m[1];
      // Trim template-literal interpolation markers — turn ${id} into :param
      p = p.replace(/\$\{[^}]+\}/g, ':param');
      // Drop trailing slash
      p = p.replace(/\/+$/, '') || '/';
      refs.add({ ref: p, file: path.relative(ROOT, file), line: lineOf(src, m.index) });
    }
  }
  return refs;
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

// --- Match a reference to an implemented route -------------------------------
function isImplemented(ref, apiRoutes, pageRoutes) {
  const all = new Set([...apiRoutes, ...pageRoutes]);
  const candidate = normalizeRoute(ref);

  if (all.has(candidate)) return true;

  // Try matching dynamic segments: ref `/api/orders/123` should match
  // implemented `/api/orders/:id`.
  for (const route of all) {
    if (!route.includes(':')) continue;
    const re = new RegExp(
      '^' + route.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/') + '$'
    );
    if (re.test(candidate)) return true;
  }
  return false;
}

// --- Allowlist matching ------------------------------------------------------
function isAllowlisted(ref, allowlist) {
  return [
    ...(allowlist.deferred || []),
    ...(allowlist.deprecated || []),
    ...(allowlist.external || []),
    ...(allowlist.internal_ui || []),
  ].some((entry) => {
    const a = normalizeRoute(entry.path);
    return ref === a || ref.startsWith(a + '/');
  });
}

// --- Main --------------------------------------------------------------------
function main() {
  const allowlist = fs.existsSync(ALLOWLIST_PATH)
    ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'))
    : {};

  const { apiRoutes, pageRoutes } = discoverImplementedRoutes();

  const sourceFiles = SOURCE_GLOBS.flatMap((dir) =>
    walk(path.join(ROOT, dir))
  );

  const gaps = []; // { ref, file, line }
  const seen = new Set();

  for (const file of sourceFiles) {
    let refs;
    try {
      refs = extractReferences(file);
    } catch {
      continue;
    }
    for (const r of refs) {
      // De-dup
      const key = `${r.ref}|${r.file}|${r.line}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Ignore non-internal lookalikes
      if (!r.ref.startsWith('/')) continue;
      // Ignore static assets
      if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|map|json|pdf)$/i.test(r.ref)) continue;
      if (r.ref.startsWith('/_next') || r.ref.startsWith('/static')) continue;

      if (isImplemented(r.ref, apiRoutes, pageRoutes)) continue;
      if (isAllowlisted(r.ref, allowlist)) continue;

      gaps.push(r);
    }
  }

  const summary = {
    implementedApiRoutes: apiRoutes.size,
    implementedPageRoutes: pageRoutes.size,
    referencedFiles: sourceFiles.length,
    uncoveredReferences: gaps.length,
  };

  if (gaps.length === 0) {
    console.log('✅ Route coverage clean.');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  console.error('❌ Route coverage failures:');
  const byRef = new Map();
  for (const g of gaps) {
    if (!byRef.has(g.ref)) byRef.set(g.ref, []);
    byRef.get(g.ref).push(`${g.file}:${g.line}`);
  }
  for (const [ref, locs] of [...byRef.entries()].sort()) {
    console.error(`  ${ref}`);
    for (const loc of locs.slice(0, 5)) {
      console.error(`    - ${loc}`);
    }
    if (locs.length > 5) {
      console.error(`    ...and ${locs.length - 5} more`);
    }
  }
  console.error('');
  console.error(JSON.stringify(summary, null, 2));
  console.error('');
  console.error(
    'To allow an intentionally absent route, add it to scripts/_route-coverage-allowlist.json'
  );
  process.exit(1);
}

main();
