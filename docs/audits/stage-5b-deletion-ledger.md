# Stage 5B Deletion Ledger

| Deleted file | Active replacement | Rationale | Restoration status |
|---|---|---|---|
| `app/admin/analytics/page.js` | `app/admin/analytics/page.tsx` | Duplicate placeholder admin page; `.tsx` version is authoritative and feature-rich. | Not needed; restore from git history if required. |
| `app/admin/login/page.js` | `app/admin/login/page.tsx` | Duplicate placeholder admin login; `.tsx` version is current. | Not needed; restore from git history if required. |
| `components/checkout/SquarePaymentForm.tsx.bak` | `components/checkout/SquarePaymentForm.tsx` | Leftover tracked backup file from an earlier edit. | Not needed; restore from git history if required. |

**No destructive deletions were performed.** All removed files are recoverable from Git history and had authoritative replacements in the working tree.
