# Taste of Gratitude — CTA Inventory

Source: `docs/audits/taste-of-gratitude-conversion-psychology.md` Section 7 and Section 7.1.

| Route | CTA text | Destination | Type | Visual status | Issue | Recommended CTA | Priority |
|---|---|---|---|---|---|---|---|
| `/` | Get Menu Texts | `/weekly-menu#weekly-texts` | Primary (visual) | White filled button | Promises non-functional SMS | "View this week's menu" | P0 |
| `/` | Shop This Week | `/catalog` | Secondary | White outline | Vague; catalog includes non-weekly | "View this week's menu" | P0 |
| `/` | Take the Wellness Quiz | `/quiz` | Tertiary | White outline | Health-goal mapping risk | "Find a flavor" or demote | P1 |
| `/` | Reserve your market pickup → | `/preorder` | Text link | Underlined | Hidden below 3 buttons | Promote when user is returning | P2 |
| Header desktop | Start Here | `/quiz` | Primary | Emerald filled | Quiz is not optimal first action | "Shop this week" | P1 |
| Header mobile | Wellness Quiz | `/quiz` | Nav item | Full-width row | Same issue | Demote or rename | P2 |
| Header desktop | Shop | `/catalog` | Nav | Text link | OK | Keep | — |
| Header desktop | This Week's Menu | `/weekly-menu` | Nav | Text link | OK | Keep | — |
| `/weekly-menu` | Preorder this week | `/preorder` | Primary | Emerald filled | Good | Keep; make dominant | P2 |
| `/weekly-menu` | Browse full catalog | `/catalog` | Secondary | White outline | Duplicates discovery | Remove or relabel | P2 |
| `/weekly-menu` | Text me the menu | `/api/lead` | Form CTA | Emerald filled | SMS not operational | "Email me the menu" | P1 |
| Product card | QuickAddButton | Cart | Primary | Emerald filled | Good | Keep | — |
| Product card | Reserve | `/preorder?product=...` | Secondary | Outline | Good | Keep | — |
| `/preorder` market step | market button | items step | Primary | Card | Good | Keep | — |
| `/preorder` items step | +/- quantity | Cart update | Primary | Round icon | Good | Keep | — |
| `/preorder` floating | Checkout | checkout step | Primary | Emerald filled | Good | Keep | — |
| `/preorder` checkout | Place Preorder | `/api/preorder` | Primary | Emerald filled | Good | Keep | — |
| Bundle card | Shop Now / CTA | `/catalog?search=...` | Primary | Outline | No real SKU | "Build this box" or remove | P1 |
| Market card | Reserve pickup | `/preorder?market=...` | Primary | Emerald filled | Good | Keep | — |
| Market card | Market details | `/markets#id` | Secondary | Outline | Duplicates info | Remove | P3 |
| `/about` | See Where We'll Be | `/markets` | Primary | Emerald filled | Good | Keep | — |
| `/about` | Shop This Week's Menu | `/catalog` | Secondary | Outline | Link to weekly menu instead | "View this week's menu" | P2 |
| `/subscriptions/gratitude-box` | Reserve my paid pilot box | `/api/subscriptions/gratitude-box` | Primary | Emerald filled | Title says subscription | Rename page + CTA consistent | P1 |
| `/quiz` | Show my recommendations | `/api/quiz` | Primary | Emerald filled | Health-goal framing | Reframe quiz first | P1 |
| Footer | Join weekly emails | `/api/lead` | Primary | Emerald filled | Honest | Keep | — |
| Retention prompts | Notify me | `/api/lead` | Multiple | Emerald filled | SMS not operational; too many intents | Single email waitlist | P2 |

## Recommended hierarchy system

- **Primary:** `h-12–14 rounded-full bg-emerald-700 text-white` — one per viewport.
- **Secondary:** `h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50`.
- **Tertiary:** underlined text link.
- **Waitlist:** `h-11 rounded-full bg-stone-900 text-white`.
- **Disabled/sold-out:** muted with explanation text.
