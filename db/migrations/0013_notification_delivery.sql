-- Preserve the existing outbox send contract: status='sent' means the email
-- provider accepted a request. It is not evidence of recipient delivery.
-- Duplicate historical message identities must stop migration for review.
CREATE UNIQUE INDEX IF NOT EXISTS checkout_notification_provider_message_once
  ON checkout_notification_outbox(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_notification_delivery_binding
  ON checkout_notification_outbox(order_id, kind, provider_message_id);

CREATE TRIGGER IF NOT EXISTS checkout_notification_provider_binding_immutable
BEFORE UPDATE OF provider_message_id ON checkout_notification_outbox
WHEN OLD.provider_message_id IS NOT NULL
  AND NEW.provider_message_id IS NOT OLD.provider_message_id
BEGIN
  SELECT RAISE(ABORT, 'NOTIFICATION_PROVIDER_BINDING_IMMUTABLE');
END;

-- Only a server-side, signature-verified webhook may populate this inbox.
-- Store fingerprints, not email addresses, subject lines or raw payloads.
-- An event can precede the successful send response being saved. Such events
-- remain unmatched until the exact provider message ID is durably bound.
CREATE TABLE IF NOT EXISTS checkout_notification_delivery_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider = 'resend'),
  provider_message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient_sha256 TEXT NOT NULL CHECK (length(recipient_sha256) = 64),
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  occurred_at TEXT NOT NULL,
  first_received_at TEXT NOT NULL,
  last_received_at TEXT NOT NULL,
  receipt_count INTEGER NOT NULL DEFAULT 1 CHECK (receipt_count > 0),
  status TEXT NOT NULL CHECK (status IN ('unmatched', 'applied', 'ignored')),
  applied_at TEXT
);
CREATE INDEX IF NOT EXISTS checkout_notification_delivery_unmatched
  ON checkout_notification_delivery_events(status, provider_message_id);

-- A provider may emit separate outcomes for each recipient of one message.
-- Never use a single recipient's delivery event to certify an entire staff
-- distribution list. The role comes from the canonical outbox, not event tags.
CREATE TABLE IF NOT EXISTS checkout_notification_deliveries (
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  recipient_sha256 TEXT NOT NULL CHECK (length(recipient_sha256) = 64),
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('customer', 'staff')),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN
    ('accepted', 'delayed', 'failed', 'delivered', 'bounced', 'suppressed', 'complained')),
  accepted_at TEXT,
  delayed_at TEXT,
  failed_at TEXT,
  delivered_at TEXT,
  bounced_at TEXT,
  suppressed_at TEXT,
  complained_at TEXT,
  last_event_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (order_id, kind, recipient_sha256),
  UNIQUE (provider_message_id, recipient_sha256),
  FOREIGN KEY (order_id, kind, provider_message_id)
    REFERENCES checkout_notification_outbox(order_id, kind, provider_message_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);
