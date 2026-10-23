# Browns Mill area non-market pickup — owner-approved plan
Date: 2026-10-23, America/New_York

## Merchant-specified operating policy
- Geographic label: **Browns Mill area, Atlanta, GA**. This is an area designation, not a street address.
- Pickup day: **Every Monday**.
- Pickup availability: **12:00 PM–5:00 PM Eastern Time**, including Eastern DST changes.
- Subtle golf-oriented copy: **"Stopping by after a round? Golf clubs welcome."**
- Do not imply affiliation, permission to use, or on-site pickup at the City of Atlanta's Browns Mill Golf Course. The golf course's public street address is NOT a verified merchant pickup point.

## Implemented safely
- One shared policy source under `lib/browns-mill-pickup.ts`, with locationVerified and bookingsOpen explicitly false; no invented street, ZIP, capacity, cutoff, or staffing.
- Pickup checkout displays the neighborhood, weekly window and gentle golf-friendly line as an informational planned option. It does not fabricate selectable appointments. Existing checkout booking requires a verified merchant-authorized specific address and staff-confirmed published windows from the public pickup API.
- Admin pickup UI has a one-click Browns Mill draft template (unpublished), and an optional builder for the next four Monday 12:00–5:00 PM windows; it REQUIRES a real capacity and order-cutoff lead time from the merchant. Generated windows default to unpublished with staffing verification false. Admin must separately enter verified street, ZIP, and address permission, explicitly affirm staffing, then publish.
- All generated appointment timestamps use explicit America/New_York wall times, including the Oct→Nov DST change.
- No live merchant DB record was inserted, no pickup address was published, and no Square payments were taken.

## Human details still required for paid appointment activation
1. A public, safe, merchant-authorized meeting point in the Browns Mill area (not necessarily the golf course).
2. Actual capacity across each Monday window, and cutoff hours before pickup.
3. Merchant check of real staffing and exact appointment instructions.

## Evidence
`tests/browns-mill-pickup.test.ts`: policy + DST + cutoff + capacity checks.
Full CI and exact-SHA Preview checks required before any production promotion.
