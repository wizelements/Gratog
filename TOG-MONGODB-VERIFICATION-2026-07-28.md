# MongoDB Menus Verification Report

**Generated:** 2026-07-28T22:01:23.564Z
**Database:** taste_of_gratitude
**Collection:** menus
**Read-only audit:** yes

## Code-derived current week range

- weekStart: `2026-07-27T04:00:00.000Z`
- weekEnd: `2026-08-03T03:59:59.999Z`

## Collection summary

- Total menus: **1**
- Active menus: **1**
- Archived menus: **0**

## Discrepancies

- **June 8, 2026 Market Menu** (`6a27f75dd6bc2b53fd053509`)
  - active menu weekStart (2026-06-08T12:00:00.000Z) does not match code current Monday (2026-07-27T04:00:00.000Z)
  - active menu weekEnd (2026-06-14T12:00:00.000Z) does not match code current Sunday (2026-08-03T03:59:59.999Z)

## All menus (most recent first)

| Title | Active | Archived | weekStart (DB) | weekEnd (DB) | marketId | Linked products |
|-------|--------|----------|----------------|--------------|----------|-----------------|
| June 8, 2026 Market Menu | ✅ | — | 2026-06-08T12:00:00.000Z | 2026-06-14T12:00:00.000Z | — | 0 |

## Proposed fixes

See discrepancies above. If authorized, update the active menu document(s) so `weekStart` and `weekEnd` match the code-derived current week range, and ensure only one menu is active at a time.
