# Turso relational schema

Migrations are ordered in `db/migrations`. Core relationships are customers to addresses/orders; products to variations/inventory/order items; markets to menus/orders; orders to items/payments/inventory events; and reward accounts to passports/stamps/transactions. Historical order/item snapshots use `SET NULL` for mutable parent references; inventory product deletion is `RESTRICT`; owned child rows use `CASCADE`.

Critical uniqueness includes Square order/payment/catalog IDs, webhook event IDs, payment idempotency keys, one inventory debit event per order, and reward source event IDs. Customer email uniqueness is conditional on a non-empty value and must be revalidated against the full source before deployment. Status fields remain text except where values are infrastructure-controlled; incomplete samples do not justify brittle business enum checks.

`operational_records` stores low-query audit, communications, configuration, and derived snapshots as validated JSON with relational source identity, timestamp, status, and fingerprint. It is not used for core customers, orders, items, payments, catalog relations, inventory, menus, or rewards.

The `migration_runs`, `migration_checkpoints`, `migration_source_records`, and `schema_migrations` tables anchor provenance to the verified backup SHA and support resume and independent reconciliation.
