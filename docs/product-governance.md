# Product Governance

**Status**: IN-EFFECT  
**Last Updated**: 2026-06-06  
**Owner**: Taste of Gratitude engineering lane

## Overview

Taste of Gratitude is a local-first, preorder-first, fulfillment-sensitive sea moss commerce system. Product and engineering decisions must reduce operational risk, not expand generic ecommerce sprawl.

## Core Business Rules

1. Checkout/payment integrity comes first.
2. Inventory truth must be server-authoritative.
3. Admin must expose operational truth: menus, markets, products, inventory, orders, fulfillment.
4. Mobile checkout is the primary conversion flow.
5. Customer-facing promises must match real operations.
6. Route surface area is a liability unless owned and verified.

## Retired Customer Surfaces

These standalone routes are retired and must redirect, not render content:

| Route | Destination | Reason |
| --- | --- | --- |
| `/rewards` | `/catalog` | Rewards is not an active storefront promise. |
| `/gratitude/rewards` | `/catalog` | Duplicate legacy rewards surface. |
| `/reviews` | `/catalog` | Reviews live on product detail pages. |
| `/community` | `/about` | Community story belongs in local brand/about content. |
| `/subscriptions` | `/catalog` | Subscriptions are not an active purchase model. |

## Non-Negotiable Engineering Rules

- Never trust client totals.
- Never trust client inventory.
- Never finalize inventory before successful payment.
- Never queue orders offline for later replay.
- Never cache checkout, admin, payment, order, inventory, cart, or account data.
- Never add a public mutation route without explicit auth/ownership classification.
- Never add a new top-level public route without updating `config/route-surface.json` and tests.
- Never put unsupported lifecycle/dependency/routing metadata in native AMP `SKILL.md` frontmatter.

## Source Of Truth

- Route/API classification: `config/route-surface.json`
- Retired-route tests: `tests/route-governance.test.ts`
- PWA cache tests: `tests/pwa-cache-governance.test.ts`
- Navigation tests: `tests/navigation-coherence.test.ts`
- Production HTTP verification: `scripts/verify-production-closure.sh`
- Skill governance overlay: `~/.config/agents/skill-governance/registry-overlay.json`

## Change Gate

Any change that reintroduces rewards, subscriptions, community, generic reviews, or offline order queueing needs explicit owner approval plus updated manifest/tests/evidence.
