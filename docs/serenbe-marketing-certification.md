# Serenbe marketing rollout and production gate

Status: PREVIEW IMPLEMENTATION only. Production promotion requires certification.

Architecture: Public signups through weekly-menu and markets pages. Explicit consent required for newsletter emails; inquiry forms are not promotional subscriptions. Subscriber identities, market preferences, campaign send ledger and signed marketing webhook events use Turso. Paused markets remain in data/markets.ts with isActive=false.

Single email authority: authenticated POST /api/markets/warm. GET does not send. CLI weekly-menu-broadcast forwards to that API without MongoDB. Marketing send feature flag defaults OFF. Old Vercel weekly cron disabled until the new procedure is certified.

QR landing link:
https://tasteofgratitude.shop/weekly-menu?market=serenbe&utm_source=serenbe_booth&utm_medium=qr&utm_campaign=serenbe_capture

Before production campaign sending: verify remote Turso production credentials; migrate lawful subscribed contacts and historical opt-outs; compare dry-run list with independent audit; certify opt-in and RFC 8058 form-POST unsubscribe, bounce and complaint webhook replay, no duplicate sends and unaffected order acknowledgements; verify Resend sending domain and actual test inbox delivery; verify Square payments, order attribution and market capacity. Only then enable MARKETING_EMAIL_SEND_ENABLED=true and restore a correctly secured scheduler.

Metrics: Captures are not purchasers; Resend API acceptance is not inbox delivery; clicks are not paid sales. Verified Square revenue attribution is null (not zero) until independently certified.
