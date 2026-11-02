#!/usr/bin/env bash
# Renew only the pinned Turso certification database credential.
set -euo pipefail
umask 077

readonly certification_database='gratog-migration-cert-20261018'
readonly certification_host='gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io'
readonly certification_repo='wizelements/Gratog'
readonly certification_environment='square-sandbox-certification'
readonly certification_branch='feat/turso-lemonade-certification-20261027'

for required_command in turso gh node; do
  command -v "$required_command" >/dev/null || {
    printf 'Required command unavailable: %s\n' "$required_command" >&2
    exit 1
  }
done
gh auth status >/dev/null 2>&1 || { echo 'Sign in with gh auth login, then rerun.' >&2; exit 1; }
test "$(gh api "repos/$certification_repo" --jq '.permissions.admin')" = true || {
  echo 'Repository administrator access is required for the protected environment secret.' >&2
  exit 1
}

certification_url="$(turso db show "$certification_database" --url)"
certification_url="${certification_url%$'\r'}"
if [[ "$certification_url" != "libsql://$certification_host" && "$certification_url" != "https://$certification_host" ]]; then
  echo 'STOP: the Turso account did not resolve the exact certification database.' >&2
  exit 1
fi

certification_token_file="$(mktemp "${TMPDIR:-/tmp}/tog-turso-token.XXXXXXXX")"
trap 'rm -f -- "$certification_token_file"' EXIT
turso db tokens create "$certification_database" --expiration 7d > "$certification_token_file"
node - "$certification_token_file" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const token = fs.readFileSync(path, 'utf8').trim();
try {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw Error();
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));
  const now = Date.now() / 1000;
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= now + 3600 || claims.exp > now + 8 * 86400) throw Error();
  fs.writeFileSync(path, token, { mode: 0o600 });
} catch {
  console.error('STOP: the newly minted credential has an invalid format or expiration.');
  process.exit(1);
}
NODE
gh secret set TURSO_STAGING_AUTH_TOKEN --repo "$certification_repo" --env "$certification_environment" < "$certification_token_file"
rm -f -- "$certification_token_file"

read -r certification_run_id certification_run_status < <(
  gh api "repos/$certification_repo/actions/workflows/398811994/runs?branch=$certification_branch&per_page=1" \
    --jq '.workflow_runs[0] | [.id, .status] | @tsv'
)
if [[ "$certification_run_id" =~ ^[0-9]+$ && "$certification_run_status" == completed ]]; then
  gh run rerun "$certification_run_id" --failed --repo "$certification_repo"
fi
echo 'PASS: certification-only Turso token renewed in the protected GitHub environment.'
echo 'The token was not printed. Return to ChatGPT for the database and Preview readback.'
