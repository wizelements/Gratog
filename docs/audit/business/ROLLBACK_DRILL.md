# Rollback Drill — v1.0-boringly-reliable

**Date:** 2026-06-01

## Targets

| Slot | Value |
| --- | --- |
| Production deployment | `gratog-6himwzv35` |
| Production commit | `0605c879` |
| Production URL | https://tasteofgratitude.shop |
| Last known-good deployment | `gratog-6himwzv35` (current) |
| Last known-good commit | `0605c879` |
| Previous green commit | `42b57a30` (CI preview redeploy) |

## Rollback procedure (Vercel)

```bash
# Identify the target deployment id
npx vercel inspect gratog-6himwzv35 --scope theangelsilvers-projects

# Promote it to production (alias swap, zero-downtime)
npx vercel promote gratog-6himwzv35 --scope theangelsilvers-projects
```

If `0605c879` itself needs to be reverted (e.g. the unsubscribe
stricter token check regresses), redeploy the prior green:

```bash
git checkout 42b57a30
npx vercel --prod --scope theangelsilvers-projects
```

## Rollback procedure (Git tag)

If `v1.0-boringly-reliable` is cut and must be retracted:

```bash
git tag -d v1.0-boringly-reliable
git push origin :refs/tags/v1.0-boringly-reliable
```

## Data rollback

No schema migrations were introduced in this release; only additive
indexes. Rolling back the deployment does **not** require dropping any
of the following indexes:

- `reward_transactions.idx_rewards_idempotency`
- `email_sends.idx_email_sends_message_id` and four supporting indexes
- `contact_messages` indexes
- `newsletter_subscribers` indexes

Leave them in place after a rollback; they are forward-compatible.

## Smoke after rollback

```bash
curl -i https://tasteofgratitude.shop/
curl -i https://tasteofgratitude.shop/api/admin/auth/me
curl -i https://tasteofgratitude.shop/api/pay/process
```

Expected: 200, 401, 410. If any drift, escalate before reopening
traffic.
