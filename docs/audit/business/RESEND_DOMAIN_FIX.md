# Resend Sender Domain — `tasteofgratitude.shop`

**Date:** 2026-06-01
**Domain id:** `2e4c2ef3-6d72-402b-8c4f-1d6a28cda93a`
**Region:** `us-east-1`
**Registrar / DNS host:** Namecheap (`pdns1.registrar-servers.com`)
**Current Resend status:** `pending` (was `failed`, re-verify triggered)

## Diagnosis

`lib/email-config.ts` hardcodes `DOMAIN = 'tasteofgratitude.shop'` for
every transactional email type. (`RESEND_FROM_EMAIL` is set in Vercel
to `hello@tasteofgratitude.net` but is **not read** by the typed sender
path — code uses `getFromAddress(emailType)` which builds the address
from the hardcoded domain.)

`POST https://api.resend.com/emails` with
`from: orders@tasteofgratitude.shop` returns:

```
HTTP 403
{"statusCode":403,"message":"The tasteofgratitude.shop domain is not verified.","name":"validation_error"}
```

Control test from the verified sender `orders@mail.codewithsolo.com`
succeeded with messageId `d65e76be-68be-4601-bbad-4e2684d6b0f9` →
Resend API key + integration are healthy. Only the domain DKIM is
blocking.

## DNS records — required vs current

| Record | Name | Required value (Resend) | Currently in DNS | Status |
| --- | --- | --- | --- | :---: |
| TXT (SPF) | `send.tasteofgratitude.shop` | `v=spf1 include:amazonses.com ~all` | matches | ✅ |
| MX (SPF) | `send.tasteofgratitude.shop` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | matches | ✅ |
| MX (Receiving) | `tasteofgratitude.shop` | `inbound-smtp.us-east-1.amazonaws.com` (priority 10) | matches | ✅ |
| **TXT (DKIM)** | **`resend._domainkey.tasteofgratitude.shop`** | **`p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDFNUON8vuFjxyPgDFqF724Q6PO1qR9+LmhX9pGy0SSH4tJsiHGGbofG75kAWYiWDxghwyLHrjRen/6nKnNVAn1wo+YN05DAZNN3gEv4G9uL6GhmlXKuW2BjWBhffqXdcBu6AH/LaRtOj47QiPNM7HXbNPa7nh3wYFAbv6hknIYkwIDAQAB`** | `p=…QD0aVAi…QYpuGlgKaD6yalF+PhwakemcU7BlWBASKwIDAQAB` (stale) | **❌** |

## Action required (manual — needs Namecheap dashboard)

1. Log into Namecheap.
2. Domain List → **tasteofgratitude.shop** → Manage → Advanced DNS.
3. Find the existing `TXT` record for host `resend._domainkey`.
4. **Replace** its value with the full required DKIM value above
   (the entire `p=MIGf…ECAwEAAB` blob).
5. Save. Namecheap TTL is auto; propagation typically takes 1–5 minutes.
6. Re-verify in Resend:

```bash
node -e 'const env=require("./.tmp/env.js");
fetch("https://api.resend.com/domains/2e4c2ef3-6d72-402b-8c4f-1d6a28cda93a/verify",{
  method:"POST",headers:{Authorization:"Bearer "+env.RESEND_API_KEY}
}).then(r=>r.json()).then(console.log);'
```

Then poll status until `verified`:

```bash
node -e 'const env=require("./.tmp/env.js");
fetch("https://api.resend.com/domains/2e4c2ef3-6d72-402b-8c4f-1d6a28cda93a",{
  headers:{Authorization:"Bearer "+env.RESEND_API_KEY}
}).then(r=>r.json()).then(d=>console.log(d.status, d.records.map(r=>r.type+":"+r.status).join(" ")));'
```

7. Send a verification test:

```bash
node -e 'const env=require("./.tmp/env.js");
fetch("https://api.resend.com/emails",{method:"POST",
  headers:{Authorization:"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
  body: JSON.stringify({
    from: "Taste of Gratitude Orders <orders@tasteofgratitude.shop>",
    to: ["delivered@resend.dev"],
    subject: "Gratog domain verification test",
    html: "<p>Verification OK.</p>"
  })
}).then(r=>r.json()).then(console.log);'
```

Expected: `{ id: "<uuid>" }` with no error.

## Alternative (no DNS change)

If the user prefers not to touch DNS, repoint the sender to a
verified domain by either:

- Setting `EMAIL_FROM_DOMAIN` env var and patching
  `lib/email-config.ts` to read `process.env.EMAIL_FROM_DOMAIN ||
  'tasteofgratitude.shop'`, then setting the var to
  `mail.codewithsolo.com` in Vercel. **Branding cost: customers receive
  emails from `orders@mail.codewithsolo.com`.**
- Or verifying a fresh subdomain (e.g. `mail.tasteofgratitude.shop`)
  on Resend that does not collide with the stale DKIM, then repointing
  via the same env var.

Both alternatives require a redeploy.

## Why this is release-blocking

Without a verified sender, **every** order confirmation, password
reset, coupon, and review email will hit Resend `403` and never reach
the customer. The new `email_sends` observability table will faithfully
record the failure — but the customer experience is "I paid and got no
receipt". Cannot tag `v1.0-boringly-reliable` in that state.
