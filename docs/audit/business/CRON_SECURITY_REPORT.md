# CRON SECURITY REPORT

Verification of `app/api/cron/*` route protection.

## Existing cron routes (audited)

| Route | File present | CRON_SECRET enforced |
| --- | --- | --- |
| `/api/cron/cleanup-locks` | yes | ✅ checks `Bearer ${process.env.CRON_SECRET}` |
| `/api/cron/daily-report`  | yes | ✅ checks `Bearer ${process.env.CRON_SECRET}` |

## Directories that exist but contain no route file (historic cleanup)

These return 404 today because Next.js will not register a route without a
file at `route.ts|js`. None of them currently expose any handler, so there is
no public attack surface. The empty directories should either be removed or
restored with a CRON_SECRET-protected handler if the schedule is wanted.

```
app/api/cron/cleanup-abandoned-orders/
app/api/cron/health-check/
app/api/cron/inventory-reconcile/
app/api/cron/missed-pickup/
app/api/cron/morning-reminders/
app/api/cron/nurture-emails/
app/api/cron/pickup-reminders/
app/api/cron/scheduled-campaigns/
app/api/cron/square-catalog-sync/
app/api/cron/subscription-reminders/
```

The boringly-reliable plan defers `cleanup-abandoned-orders` (Phase 7.5) to a
later iteration — it is desirable but not on the revenue/security critical
path.

## Recommendation

Any new cron route MUST start with:

```ts
const cronSecret = process.env.CRON_SECRET;
const auth = request.headers.get('authorization');
if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

A shared `verifyCronAuth(request)` helper in `lib/` would prevent drift and
should be added when the next cron route is restored.
