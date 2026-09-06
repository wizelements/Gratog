# Data authority matrix

| Domain | Authority | Turso role | External key / invariant |
| --- | --- | --- | --- |
| Catalog identity and variations | Square | Relational projection and application metadata | Square catalog and variation IDs |
| Product price used for checkout | Square-backed server catalog | Cached projection; never an independent competing price | Square variation ID, integer cents |
| Provider payment state | Square | Durable mapping and application workflow state | Square payment/order IDs |
| Application order | Gratog | Authoritative application order and item history | Mongo ID retained; Square order ID unique when present |
| Customer profile and LTV | Gratog | Authoritative profile; LTV changes only after payment success | Internal ID; Square customer ID when present |
| Local sellable inventory policy | Gratog, reconciled from Square | Authoritative local count and immutable event ledger | Product/variation IDs; one debit per paid order |
| Menus and markets | Gratog | Authoritative relational content/configuration | Retained IDs |
| Rewards/passports | Gratog | Authoritative account, passport, stamp and transaction ledger | Retained IDs and idempotency event IDs |
| Webhook delivery identity | External provider | Durable replay ledger | Provider event ID unique |
| Analytics and sync products | Derived from application/Square events | Rebuildable projection or operational history | Source event/catalog IDs |
| Email delivery status | Resend | Application ledger/projection | Provider message/event ID |

Unresolved: the supplied Turso database is not labelled test, staging, or production. Remote writes remain blocked until `TURSO_TARGET_ENV=staging` or `test` is explicitly established.
