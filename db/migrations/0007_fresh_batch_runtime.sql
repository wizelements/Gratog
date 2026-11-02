CREATE TABLE IF NOT EXISTS fresh_batch_requests (
 id TEXT PRIMARY KEY,email TEXT NOT NULL,phone TEXT,marketing_email_consent INTEGER NOT NULL CHECK(marketing_email_consent IN(0,1)),requested_product_slug TEXT,requested_product_name TEXT,requested_flavor_text TEXT,flavor_profile TEXT,quantity REAL NOT NULL,quantity_unit TEXT NOT NULL,gallon_equivalent REAL NOT NULL,preferred_market_id TEXT NOT NULL,need_by_date TEXT,notes TEXT,request_source TEXT NOT NULL,status TEXT NOT NULL,linked_batch_id TEXT,owner_notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS fresh_batch_requests_email_time ON fresh_batch_requests(lower(email),created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_batch_requests_status_time ON fresh_batch_requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS batch_campaigns (
 id TEXT PRIMARY KEY,public_name TEXT NOT NULL,internal_flavor_key TEXT NOT NULL,product_slug TEXT,product_category TEXT,batch_type TEXT NOT NULL,target_gallons REAL NOT NULL,reserved_gallons REAL NOT NULL,expected_market_gallons REAL NOT NULL,sampling_ounces REAL NOT NULL,actual_yield_ounces REAL,process_loss_percentage REAL NOT NULL,production_date TEXT NOT NULL,market_id TEXT NOT NULL,request_cutoff TEXT NOT NULL,reservation_cutoff TEXT NOT NULL,shelf_life_end TEXT,market_safe INTEGER NOT NULL CHECK(market_safe IN(0,1)),ingredient_availability INTEGER NOT NULL CHECK(ingredient_availability IN(0,1)),owner_approved INTEGER NOT NULL CHECK(owner_approved IN(0,1)),standard_gallon_price_cents INTEGER NOT NULL,setup_fee_cents INTEGER NOT NULL,deposit_percent REAL NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS batch_reservations (
 id TEXT PRIMARY KEY,request_id TEXT NOT NULL,batch_id TEXT NOT NULL,customer_email TEXT NOT NULL,quantity REAL NOT NULL,quantity_unit TEXT NOT NULL,gallon_equivalent REAL NOT NULL,standard_price_cents INTEGER NOT NULL,setup_fee_cents INTEGER NOT NULL,deposit_cents INTEGER NOT NULL,balance_due_cents INTEGER NOT NULL,final_price_cents INTEGER NOT NULL,square_payment_link_id TEXT,square_order_id TEXT,payment_url TEXT,payment_status TEXT NOT NULL,pickup_status TEXT NOT NULL,market_id TEXT NOT NULL,confirmation_sent_at TEXT,completed_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS batch_reservations_batch ON batch_reservations(batch_id,created_at);
CREATE TABLE IF NOT EXISTS runtime_counters(name TEXT PRIMARY KEY,value INTEGER NOT NULL DEFAULT 0);
