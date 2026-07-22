# Taste of Gratitude — Image Inventory

Scope: hero images, product images, founder images, market images, lifestyle images, icons, illustrations, decorative graphics, and fallback assets across public pages.

| Route / component | Image asset | Source | Purpose | Authenticity | Relevance | Mobile behavior | Accessibility | Recommendation | Priority |
|---|---|---|---|---|---|---|---|---|---|
| `/` hero | `/images/gratog-bg.PNG` | Local | Product/market hero | Generic/reused | Moderate | Stacks above text on mobile | Alt provided | Replace with real current product or founder photo | P1 |
| `/` founder section | `/images/gratog-bg.PNG` | Local | Founder story illustration | Same generic image as hero | Weak | 1-column, below text | Alt: "Small batch products" | Replace with founder photo or remove | P2 |
| `/` product cards | External editmysite.com + `/images/*` | Mixed | Product thumbnails | Variable | Moderate | 4:3 card crop | Alt: "{name} from Taste of Gratitude" | Audit for packaging accuracy; replace with SKU photos | P1 |
| `/` bundle section | None | — | Bundle cards | N/A | N/A | Text-only cards | N/A | Add box contents photo when SKUs exist | P2 |
| `/` community proof | None (text quotes) | — | Trust signal | N/A | N/A | 1-column | N/A | Remove generic quotes or add real reviewer photos with permission | P1 |
| `/weekly-menu` hero | None (SMS card only) | — | Menu landing | N/A | N/A | SMS form card | N/A | Add featured product image | P2 |
| `/weekly-menu` product cards | External/mixed | Mixed | Weekly items | Variable | Moderate | 4:3 crop | Alt: product name | Replace with consistent SKU photos | P1 |
| `/catalog` product cards | External/mixed | Mixed | Catalog browse | Variable | Moderate | Grid crop | Alt: product name | Replace with consistent SKU photos | P1 |
| `/product/[slug]` primary | `images[0]` or `image` or fallback | Mixed/Local | Product detail | Variable | High | Square gallery + thumbnails | Alt uses product name | Replace with high-res SKU photos; test zoom | P1 |
| `/about` hero | Unsplash holistic wellness | Remote/stock | Emotional backdrop | Stock, not brand-specific | Weak | Crops to text overlay | Alt acceptable | Replace with founder kitchen/market photo | P1 |
| `/about` process | None | — | 3-step process | N/A | N/A | Text-only | N/A | Add process photos when available | P3 |
| `/markets` | Emoji only (🏡/🏪) | — | Market cards | N/A | N/A | Card icons | — | Add real booth/market photos | P2 |
| `/subscriptions/gratitude-box` | None | — | Box landing | N/A | N/A | Text-only | N/A | Add box contents photo or illustration | P2 |
| `/quiz` | None | — | Quiz | N/A | N/A | Text-only | N/A | Optional: add small product icons for options | P3 |
| `/preorder` item cards | item.image or item.emoji | Mixed | Preorder thumbnails | Variable | Fallback to emoji | 280px horizontal scroll | Alt: item.name | Replace with consistent SKU photos | P1 |
| Footer | Iconography (Mail, Lock, ShieldCheck, Truck, RefreshCw) | lucide-react | Trust signals | N/A | N/A | Inline | `aria-hidden="true"` | Keep | — |
| Header | ShoppingBag icon | lucide-react | Logo mark | N/A | N/A | Visible on mobile | `aria-hidden` if decorative | Keep; consider adding wordmark on mobile | P2 |
| PWA splash screens | `/splash/*.png` | Local | App launch | Unknown | N/A | N/A | N/A | Verify branded content | P3 |
| OG / social | `/og-image.jpg` | Local | Social sharing | Unknown | N/A | N/A | Alt in metadata | Verify branded content and current menu | P2 |

## Image rules observed and violated

### Observed
- Product cards use `object-cover` to maintain aspect ratio.
- Alt text generally references product name or brand.
- Icons are marked `aria-hidden="true"` where appropriate.

### Violated
- `/images/gratog-bg.PNG` is used in two unrelated contexts on the homepage.
- About hero uses generic Unsplash "holistic wellness" imagery instead of founder/product photography.
- No market/booth photography to prove real-world presence.
- Product images are externally hosted on editmysite.com, creating dependency and potential mismatch with current packaging.
- No box/Gratitude Box visual.
- No founder face visible on homepage or about hero.

## Missing image types

1. Founder portrait at market or in kitchen.
2. Individual SKU photography with visible labels.
3. Market booth / customer interaction photos.
4. Process photos (soaking, blending, jarring).
5. Gratitude Box contents flat-lay.
6. Ingredient detail shots (sea moss, fruits, herbs).
7. Packaging/label close-ups.
