CREATE UNIQUE INDEX IF NOT EXISTS inventory_order_event_once
  ON inventory_events(order_id,event_type)
  WHERE order_id IS NOT NULL AND event_type IN ('order_debit','order_credit');
