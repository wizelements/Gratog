#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/gratog-deploy-guard.sh --target production|staging|both [--mode preflight|deploy] [--execute] [--allow-dirty] [--commit-message "..."]

Default mode is a dry-run preflight. --execute runs local verification commands.
This guard never prints secret values and refuses deploy-mode execution from the
wrong branch or a dirty tree unless --allow-dirty is explicitly supplied.
USAGE
}

target=""
mode="preflight"
execute=0
allow_dirty=0
commit_message=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      target="${2:-}"
      shift 2
      ;;
    --target=*)
      target="${1#--target=}"
      shift
      ;;
    --mode)
      mode="${2:-}"
      shift 2
      ;;
    --mode=*)
      mode="${1#--mode=}"
      shift
      ;;
    --execute)
      execute=1
      shift
      ;;
    --dry-run)
      execute=0
      shift
      ;;
    --allow-dirty)
      allow_dirty=1
      shift
      ;;
    --commit-message)
      commit_message="${2:-}"
      shift 2
      ;;
    --commit-message=*)
      commit_message="${1#--commit-message=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$target" || ! "$target" =~ ^(production|staging|both)$ ]]; then
  echo "--target must be production, staging, or both" >&2
  usage >&2
  exit 2
fi

if [[ ! "$mode" =~ ^(preflight|deploy)$ ]]; then
  echo "--mode must be preflight or deploy" >&2
  usage >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$repo_root"

branch="$(git branch --show-current)"
head="$(git rev-parse --short=12 HEAD)"
ci_ref="${GITHUB_BASE_REF:-${GITHUB_REF_NAME:-}}"
lane_ref="$branch"
if [[ "$mode" == "preflight" && -n "$ci_ref" ]]; then
  lane_ref="$ci_ref"
elif [[ -z "$lane_ref" ]]; then
  lane_ref="$ci_ref"
fi

echo "Gratog deploy guard"
echo "  target: $target"
echo "  mode:   $mode"
echo "  branch: $branch"
if [[ -n "$ci_ref" && "$ci_ref" != "$branch" ]]; then
  echo "  ci-ref: $ci_ref"
fi
echo "  head:   $head"
echo "  exec:   $execute"

expected_branch=""
case "$target" in
  production) expected_branch="main" ;;
  staging) expected_branch="review-qa-prod-deploy" ;;
  both) expected_branch="main|review-qa-prod-deploy" ;;
esac

if [[ "$mode" == "deploy" && -z "$branch" ]]; then
  echo "Deploy mode must run from a checked-out local branch, not a detached CI ref." >&2
  exit 1
fi

if [[ "$target" == "production" && "$lane_ref" != "main" ]]; then
  echo "Production guard must run on or target main (current: ${lane_ref:-unknown})" >&2
  exit 1
fi

if [[ "$target" == "staging" && "$lane_ref" != "review-qa-prod-deploy" ]]; then
  echo "Staging guard must run on or target review-qa-prod-deploy (current: ${lane_ref:-unknown})" >&2
  exit 1
fi

if [[ "$target" == "both" && ! "$lane_ref" =~ ^(main|review-qa-prod-deploy)$ ]]; then
  echo "Both-target guard must run from or target a known Gratog lane ($expected_branch); current: ${lane_ref:-unknown}" >&2
  exit 1
fi

if [[ "$mode" == "deploy" ]]; then
  if [[ "$target" == "production" && "$branch" != "main" ]]; then
    echo "Production deploy mode must run on main (current branch: $branch)" >&2
    exit 1
  fi

  if [[ "$target" == "staging" && "$branch" != "review-qa-prod-deploy" ]]; then
    echo "Staging deploy mode must run on review-qa-prod-deploy (current branch: $branch)" >&2
    exit 1
  fi
fi

if [[ $allow_dirty -eq 0 && -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit/stash changes or pass --allow-dirty for local preflight only." >&2
  git status --short >&2
  exit 1
fi

if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '^\.env\.example$' >/dev/null; then
  echo "Forbidden tracked environment file found:" >&2
  git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '^\.env\.example$' >&2
  exit 1
fi

required_files=(
  app/robots.ts
  app/sitemap.ts
  app/layout.js
  app/api/payments/route.ts
  app/api/webhooks/square/route.ts
  app/api/webhooks/resend/route.js
  public/sw.js
  lib/pwa.ts
  next.config.js
  vercel.json
  config/route-surface.json
  .env.example
  package.json
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Required guard file missing: $file" >&2
    exit 1
  fi
done

node <<'NODE'
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function assertContains(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} missing ${needle}`);
}

const routeSurface = JSON.parse(read('config/route-surface.json'));
const sw = read('public/sw.js');
const pwa = read('lib/pwa.ts');
const nextConfig = read('next.config.js');
const vercel = read('vercel.json');
const robots = read('app/robots.ts');
const sitemap = read('app/sitemap.ts');
const envExample = read('.env.example');
const packageJson = JSON.parse(read('package.json'));

for (const pagePrefix of routeSurface.pwaNetworkOnlyPages) {
  assertContains(sw, `url.pathname.startsWith('${pagePrefix}')`, 'public/sw.js');
}

for (const apiPrefix of routeSurface.criticalApis.networkOnly) {
  const parts = apiPrefix.split('/').filter(Boolean);
  let covered = false;
  for (let i = parts.length; i >= 2; i--) {
    const prefix = `/${parts.slice(0, i).join('/')}`;
    if (sw.includes(`pathname.startsWith('${prefix}')`)) {
      covered = true;
      break;
    }
  }
  if (!covered) fail(`public/sw.js does not force network-only for ${apiPrefix}`);
}

assertContains(sw, "const CACHE_VERSION = 'v14-20260614-hardening'", 'public/sw.js');
assertContains(pwa, "const SERVICE_WORKER_VERSION = '20260614-hardening'", 'lib/pwa.ts');

for (const path of ['/admin', '/cart', '/checkout', '/order']) {
  assertContains(nextConfig, `source: "${path}/:path*"`, 'next.config.js');
  assertContains(vercel, `"source": "${path}/:path*"`, 'vercel.json');
}
assertContains(nextConfig, 'Cache-Control", value: "no-store"', 'next.config.js api headers');
assertContains(nextConfig, 'X-Robots-Tag", value: "noindex, nofollow"', 'next.config.js sensitive headers');
assertContains(nextConfig, 'noindex, nofollow, noarchive', 'next.config.js preview noindex headers');
assertContains(nextConfig, 'VERCEL_ENV', 'next.config.js preview noindex gating');
assertContains(vercel, 'private, no-cache, no-store, max-age=0, must-revalidate', 'vercel.json sensitive headers');

for (const excluded of ['/admin', '/api', '/cart', '/checkout', '/order', '/account', '/login', '/register']) {
  assertContains(robots, `'${excluded}'`, 'app/robots.ts');
}
assertContains(robots, "disallow: '/'", 'app/robots.ts staging noindex');
assertContains(robots, 'VERCEL_ENV', 'app/robots.ts indexability gating');
assertContains(sitemap, 'toProductEntries', 'app/sitemap.ts product payload normalization');
assertContains(sitemap, 'return []', 'app/sitemap.ts staging sitemap suppression');
assertContains(sitemap, 'VERCEL_ENV', 'app/sitemap.ts indexability gating');

for (const staleSeoFile of ['next-sitemap.config.js', 'public/robots.txt', 'public/sitemap.xml', 'public/sitemap-0.xml']) {
  if (fs.existsSync(staleSeoFile)) fail(`${staleSeoFile} must not exist; App Router metadata routes are the SEO source of truth`);
}
if ((packageJson.scripts?.postbuild || '').includes('next-sitemap')) {
  fail('package.json must not run next-sitemap in postbuild');
}
if (packageJson.dependencies?.['next-sitemap'] || packageJson.devDependencies?.['next-sitemap']) {
  fail('package.json must not depend on next-sitemap');
}

for (const envName of [
  'MONGODB_URI',
  'SQUARE_ACCESS_TOKEN',
  'SQUARE_APPLICATION_ID',
  'SQUARE_LOCATION_ID',
  'SQUARE_WEBHOOK_SIGNATURE_KEY',
  'RESEND_API_KEY',
  'RESEND_WEBHOOK_SECRET',
  'JWT_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
]) {
  assertContains(envExample, `${envName}=`, '.env.example');
}

if (process.exitCode) process.exit(process.exitCode);
NODE

echo "Static guard checks passed."

if [[ $execute -eq 0 ]]; then
  echo "Dry run complete. Re-run with --execute to run local verification commands."
  exit 0
fi

if [[ "$mode" == "deploy" && -z "$commit_message" ]]; then
  echo "Deploy mode requires --commit-message so the change window is auditable." >&2
  exit 1
fi

echo "Running local verification..."
npm run check:route-governance
npm run typecheck:ci
npm run build

echo "Deploy guard verification passed."
if [[ "$mode" == "deploy" ]]; then
  echo "Commit message recorded for operator use: $commit_message"
  echo "This guard intentionally does not push from unattended environments. Commit, stage, and deploy from an authenticated lane."
fi
