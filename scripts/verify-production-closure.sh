#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://tasteofgratitude.shop}"
STATUS=0

log() { printf '\n== %s ==\n' "$1"; }
pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1"; STATUS=1; }

http_code() {
  curl -sS -o /dev/null -w '%{http_code}' "$1"
}

http_code_no_follow() {
  curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "$1"
}

expect_code() {
  local label="$1" url="$2" expected="$3" code
  code="$(http_code "$url")"
  if [ "$code" = "$expected" ]; then pass "$label -> $code"; else fail "$label expected $expected got $code"; fi
}

log "public route smoke"
for route in / /menu /catalog /markets /checkout /admin/login /api/health /sw.js /manifest.json; do
  expect_code "$route" "$BASE_URL$route" 200
done

log "retired route redirects"
declare -A retired=(
  ["/rewards"]="/catalog"
  ["/gratitude/rewards"]="/catalog"
  ["/reviews"]="/catalog"
  ["/community"]="/about"
  ["/subscriptions"]="/catalog"
)
for route in "${!retired[@]}"; do
  read -r code redirect <<<"$(http_code_no_follow "$BASE_URL$route")"
  case "$code" in
    301|302|307|308)
      if [ "${redirect#*$BASE_URL}" = "${retired[$route]}" ] || [ "$redirect" = "$BASE_URL${retired[$route]}" ]; then
        pass "$route redirects to ${retired[$route]} ($code)"
      else
        fail "$route redirected to unexpected target: $redirect"
      fi
      ;;
    *) fail "$route expected redirect got $code" ;;
  esac
done

log "public mutation and admin auth boundaries"
code="$(curl -L -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/orders" -H 'Content-Type: application/json' -d '{}')"
[ "$code" = "410" ] && pass "POST /api/orders -> 410" || fail "POST /api/orders expected 410 got $code"
code="$(curl -L -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/inventory" -H 'Content-Type: application/json' -d '{}')"
[ "$code" = "401" ] && pass "POST /api/inventory unauth -> 401" || fail "POST /api/inventory expected 401 got $code"
code="$(curl -L -sS -o /dev/null -w '%{http_code}' -X PATCH "$BASE_URL/api/orders/DOES-NOT-EXIST/status" -H 'Content-Type: application/json' -d '{"status":"ready"}')"
[ "$code" = "401" ] && pass "PATCH order status unauth -> 401" || fail "PATCH order status expected 401 got $code"
code="$(http_code "$BASE_URL/api/admin/orders")"
[ "$code" = "401" ] && pass "GET /api/admin/orders unauth -> 401" || fail "GET /api/admin/orders expected 401 got $code"
read -r code redirect <<<"$(http_code_no_follow "$BASE_URL/admin")"
[ "$code" = "307" ] && printf '%s' "$redirect" | grep -q '/admin/login' && pass "/admin redirects to login" || fail "/admin expected login redirect got $code $redirect"

log "sitemap and PWA HTTP checks"
if curl -sS "$BASE_URL/sitemap.xml" | grep -E '/(rewards|gratitude/rewards|reviews|community|subscriptions)' >/dev/null; then
  fail "sitemap includes retired routes"
else
  pass "sitemap excludes retired routes"
fi

sw_body="$(curl -sS "$BASE_URL/sw.js")"
printf '%s' "$sw_body" | grep -q 'v13-20260606-closure' && pass "sw.js closure version present" || fail "sw.js closure version missing"
printf '%s' "$sw_body" | grep -q 'sync-orders\|pendingOrders\|fetch('\''/api/orders' && fail "sw.js still has offline order replay" || pass "sw.js has no offline order replay"
curl -sSI "$BASE_URL/sw.js" | grep -qi 'cache-control:.*no-cache.*no-store.*must-revalidate' && pass "sw.js no-store header" || fail "sw.js no-store header missing"
curl -sSI "$BASE_URL/manifest.json" | grep -qi 'cache-control:.*no-cache.*no-store.*must-revalidate' && pass "manifest no-store header" || fail "manifest no-store header missing"

log "optional authenticated admin smoke"
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  cookie_jar="$(mktemp -p . .admin-cookie.XXXXXX)"
  trap 'rm -f "$cookie_jar"' EXIT
  login_code="$(curl -sS -c "$cookie_jar" -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/admin/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"
  [ "$login_code" = "200" ] && pass "admin login -> 200" || fail "admin login expected 200 got $login_code"
  code="$(curl -sS -b "$cookie_jar" -o /dev/null -w '%{http_code}' "$BASE_URL/api/admin/auth/me")"
  [ "$code" = "200" ] && pass "admin me authenticated -> 200" || fail "admin me expected 200 got $code"
  for route in '/api/admin/orders?limit=1' '/api/admin/products?limit=1' '/api/admin/menus' '/api/admin/markets'; do
    code="$(curl -sS -b "$cookie_jar" -o /dev/null -w '%{http_code}' "$BASE_URL$route")"
    [ "$code" = "200" ] && pass "$route authenticated -> 200" || fail "$route expected 200 got $code"
  done
else
  printf 'SKIP authenticated admin smoke: ADMIN_EMAIL/ADMIN_PASSWORD not set.\n'
fi

exit "$STATUS"
