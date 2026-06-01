# Gratog Runbook

**Last updated:** 2026-06-01

## Quick facts

| Item | Value |
| --- | --- |
| Production URL | https://tasteofgratitude.shop |
| Current production deployment | `gratog-6himwzv35` |
| Current production commit | `0605c879` |
| Last green tag candidate (NOT yet cut) | `v1.0-boringly-reliable` — pending Blockers B-A and B-B (see FINAL_SCORECARD.md) |
| Vercel project | `theangelsilvers-projects/gratog` |
| Mongo cluster | `gratitude0.1ckskrv.mongodb.net` / db `taste_of_gratitude` |
| Email provider | Resend (sender domain currently **unverified** — see Issue Log) |

## Daily checks

```bash
# Storefront up
curl -fsS -o /dev/null -w "%{http_code}\n" https://tasteofgratitude.shop/   # expect 200

# Admin gate intact
curl -fsS -o /dev/null -w "%{http_code}\n" https://tasteofgratitude.shop/api/admin/auth/me   # expect 401

# Deprecated routes still blocked
for u in pay/process checkout create-checkout; do
  curl -fsS -o /dev/null -w "%-22s %{http_code}\n" "$u" "https://tasteofgratitude.shop/api/$u"
done   # expect 410 each
```

## Index maintenance

```bash
# Pull production env (do not commit)
npx vercel env pull --environment=production .tmp/.env.prod.fresh

# Run idempotent index setup
node -e '
const fs=require("fs"); const t=fs.readFileSync(".tmp/.env.prod.fresh","utf8");
for(const l of t.split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(?:"([^"]*)"|(.*))$/);if(m)process.env[m[1]]=(m[2]??m[3]).replace(/\\n$/,"");}
require("./scripts/setup-database-indexes.js").setupIndexes();
'
```

## Incident response

1. **Storefront 5xx**: roll back to last-known-good deployment via
   `npx vercel promote gratog-6himwzv35`. See ROLLBACK_DRILL.md.
2. **Square webhook duplicates**: rely on `paidEffectsAppliedAt`
   atomic claim in `app/api/payments/route.ts` + unique partial
   `reward_transactions` index. No manual intervention required.
3. **Email failures**: check `email_sends` collection. If
   `status:"failed"` with Resend domain error → re-verify sender
   domain or repoint `RESEND_FROM_EMAIL`. After fix, replay the
   affected `orderId`.

## Issue log

- 2026-06-01 — Resend sender domain `tasteofgratitude.shop` is not
  verified. All 3 `contact_notification` sends today failed. Customer
  receipts are at risk. **Open.**
- 2026-06-01 — Zero paid orders since 2026-05-30 deployment; new
  paid-effects code path has no live coverage. **Open until first
  controlled live order succeeds.**
- 2026-06-01 — `customers` collection empty; canonical LTV
  destination undefined. Tracked in CUSTOMER_LTV_BACKFILL_REPORT.md.
  Non-blocking. **Open.**

## Deferred items (intentional)

- Abandoned cart cron
- Advanced admin order-state tooling
- Newsletter automation
- Reviews
- Recommendations
- Coupons UI
- Tier 2 conversion features

Do not implement before v1.0-boringly-reliable is tagged.
