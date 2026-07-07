# Taste of Gratitude Taskfeed

Local issue tracker for `tasteofgratitude.shop` funnel, copy, compliance, and menu intake tasks.

## Files

- `tasks.json` — current open/new/approved/in_progress/done/snoozed tasks
- `history.jsonl` — append-only log of every check run
- `YYYY-MM-DD.md` — daily markdown digest for owner review

## Run checks

```bash
# Full funnel check (read-only)
npm run tog:check

# Send Telegram digest (needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
npm run tog:notify

# Dry-run Telegram message without sending
npm run tog:notify:dry
```

## Manual menu intake (fallback if Telegram commands are not ready)

```bash
# Paste menu text to a file, then:
npm run tog:menu-intake -- --file ./menu-paste.txt
npm run tog:menu-preview
npm run tog:menu-approve
```

## Disable

Remove or comment out the npm scripts in `package.json`. No cron is auto-enabled by these scripts.

## Safety

- No secrets are printed to taskfeed files.
- Telegram token is never sent to the frontend.
- No production deployment is triggered by these scripts.
