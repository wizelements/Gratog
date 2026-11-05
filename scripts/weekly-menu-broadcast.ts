#!/usr/bin/env npx tsx
/**
 * Single authority for marketing sends: secured Turso-backed web API.
 * Legacy direct MongoDB/Resend broadcast is intentionally retired.
 * CLI dry-runs by default; --send requires an explicit subject/body,
 * API bearer token and the server's marketing send enable flag.
 */
function parse(argv: string[]) {
  const values: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const name = argv[i].slice(2);
    values[name] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return values;
}
async function run() {
  const args = parse(process.argv.slice(2));
  if (args['image-url']) throw Error('Image attachments are not yet supported by the new broadcast path.');
  const token = process.env.WEEKLY_WARM_CRON_SECRET || process.env.ADMIN_API_TOKEN;
  if (!token) throw Error('Marketing API token must be configured. No MongoDB fallback is permitted.');
  const url = (process.env.MARKETING_API_BASE_URL || 'https://tasteofgratitude.shop').replace(/\/$/, '');
  const destination = new URL('/api/markets/warm', url);
  if (destination.protocol !== 'https:' && destination.hostname !== 'localhost') throw Error('HTTPS is required');
  const raw = {
    marketId: typeof args.market === 'string' ? args.market : 'serenbe',
    week: typeof args.week === 'string' ? args.week : undefined,
    subject: typeof args.subject === 'string' ? args.subject : undefined,
    message: typeof args.body === 'string' ? args.body : undefined,
    limit: typeof args.limit === 'string' ? Number(args.limit) : undefined,
    send: args.send === true,
  };
  if (raw.send && (!raw.subject || !raw.message)) throw Error('Subject and body are required for live sends.');
  const result = await fetch(destination, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(raw),
  });
  const json = await result.json().catch(() => ({}));
  if (!result.ok || !json.success) throw Error('Broadcast API declined request: ' + (json.error || result.status));
  console.log(JSON.stringify(json));
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
