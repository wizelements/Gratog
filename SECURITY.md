# Security Policy

## Scope

Gratog is production commerce software. Security reports involving authentication, payments, webhooks, customer data, scheduled jobs, secrets, or production deployment should be treated as potentially consequential.

## Reporting a vulnerability

Do **not** publish exploit details, credentials, private customer information, or reproducible sensitive data in a public issue.

Preferred paths:

1. Use GitHub's private vulnerability/security-advisory flow for this repository when available.
2. Otherwise email **contact@cod3blackagency.com** with `SECURITY — Gratog` in the subject.

Include the affected surface, impact, reproduction steps, and the smallest safe evidence necessary to verify the issue.

## Engineering expectations

Security-sensitive changes should preserve and verify the relevant controls, including where applicable:

- server-side authorization rather than UI-only gating;
- secret isolation from source control and browser bundles;
- webhook authenticity/signature verification;
- bounded and validated external input;
- least-privilege service credentials;
- protected cron/scheduled routes;
- secure session/cookie handling;
- dependency and code scanning;
- production HTTPS/security headers;
- safe failure behavior that does not silently complete a transaction.

The repository includes security-oriented workflows/tests, but their presence is not proof that every control above applies to every route.

## Disclosure

Please allow the maintainers to validate and remediate a report before public disclosure. Response and remediation timing depends on severity, exploitability, affected data/users, and deployment risk.
