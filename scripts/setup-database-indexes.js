#!/usr/bin/env node
/**
 * Database Index Setup Script
 * Run: node scripts/setup-database-indexes.js
 * 
 * Creates MongoDB indexes for optimal query performance.
 * Safe to run multiple times - uses createIndexes (idempotent).
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI or MONGO_URL environment variable required');
  process.exit(1);
}

const INDEXES = {
  // Orders collection - critical for payment lookups
  orders: [
    { key: { id: 1 }, unique: true, name: 'idx_orders_id' },
    // _id is implicitly unique; do not redeclare here (MongoDB rejects it).
    { key: { 'customer.email': 1 }, name: 'idx_orders_customer_email' },
    { key: { status: 1, createdAt: -1 }, name: 'idx_orders_status_created' },
    { key: { paymentStatus: 1 }, name: 'idx_orders_payment_status' },
    { key: { paymentStatus: 1, createdAt: 1 }, name: 'idx_orders_payment_created' },
    { key: { abandonedAt: 1 }, sparse: true, name: 'idx_orders_abandoned_at' },
    { key: { abandonedRecoverySentAt: 1 }, sparse: true, name: 'idx_orders_abandoned_recovery_sent' },
    { key: { squarePaymentId: 1 }, name: 'idx_orders_square_payment' },
    { key: { orderNumber: 1 }, unique: true, sparse: true, name: 'idx_orders_number' },
    { key: { 'metadata.preorderDate': 1 }, sparse: true, name: 'idx_orders_preorder_date' },
    // Compound index for admin queries
    { key: { status: 1, 'metadata.preorderDate': 1 }, sparse: true, name: 'idx_orders_status_preorder' },
  ],

  // Payment records - critical for idempotency checks
  payment_records: [
    { key: { 'metadata.orderId': 1 }, name: 'idx_payments_order_id' },
    { key: { squarePaymentId: 1 }, name: 'idx_payments_square_id' },
    { key: { status: 1, createdAt: -1 }, name: 'idx_payments_status_created' },
    { key: { 'metadata.orderId': 1, status: 1 }, name: 'idx_payments_order_status' },
    // TTL index for cleanup (optional - keep 90 days)
    // { key: { createdAt: 1 }, expireAfterSeconds: 7776000, name: 'idx_payments_ttl' },
  ],

  // Products/catalog
  products: [
    { key: { slug: 1 }, unique: true, name: 'idx_products_slug' },
    { key: { category: 1, 'metadata.featured': 1 }, name: 'idx_products_category_featured' },
    { key: { available: 1 }, name: 'idx_products_available' },
    { key: { purchaseStatus: 1 }, name: 'idx_products_purchase_status' },
    { key: { 'metadata.featured': 1 }, sparse: true, name: 'idx_products_featured' },
    { key: { updatedAt: -1 }, name: 'idx_products_updated' },
  ],

  // Product reviews
  product_reviews: [
    { key: { productId: 1, status: 1 }, name: 'idx_reviews_product_status' },
    { key: { status: 1, helpful: -1, createdAt: -1 }, name: 'idx_reviews_featured' },
    { key: { 'customer.email': 1 }, name: 'idx_reviews_customer_email' },
    { key: { verifiedPurchase: 1 }, name: 'idx_reviews_verified' },
  ],

  // Users/Customers
  users: [
    { key: { email: 1 }, unique: true, name: 'idx_users_email' },
    { key: { phone: 1 }, sparse: true, name: 'idx_users_phone' },
    { key: { role: 1 }, name: 'idx_users_role' },
    { key: { createdAt: -1 }, name: 'idx_users_created' },
  ],

  // Coupons
  coupons: [
    { key: { code: 1 }, unique: true, name: 'idx_coupons_code' },
    { key: { active: 1, expiresAt: 1 }, name: 'idx_coupons_active_expires' },
    { key: { 'usage.customerEmails': 1 }, name: 'idx_coupons_customer_usage' },
  ],

  // Inventory
  inventory: [
    { key: { productId: 1 }, name: 'idx_inventory_product' },
    { key: { 'marketSchedule.date': 1 }, name: 'idx_inventory_market_date' },
    { key: { reservedUntil: 1 }, sparse: true, name: 'idx_inventory_reserved' },
  ],

  // Market schedules
  market_schedules: [
    { key: { date: 1 }, name: 'idx_market_date' },
    { key: { location: 1, date: 1 }, name: 'idx_market_location_date' },
    { key: { active: 1, date: 1 }, name: 'idx_market_active' },
  ],

  // Sessions (for analytics/tracking)
  sessions: [
    { key: { sessionId: 1 }, unique: true, name: 'idx_sessions_id' },
    { key: { userId: 1 }, sparse: true, name: 'idx_sessions_user' },
    { key: { lastActive: -1 }, name: 'idx_sessions_last_active' },
    // TTL for session cleanup
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'idx_sessions_ttl' },
  ],

  // Staff notifications
  staff_notifications: [
    { key: { orderId: 1 }, name: 'idx_staff_notif_order' },
    { key: { claimed: 1, createdAt: -1 }, name: 'idx_staff_notif_unclaimed' },
    { key: { 'staff.id': 1 }, name: 'idx_staff_notif_staff' },
  ],

  // Rewards/transactions
  reward_transactions: [
    { key: { userId: 1, createdAt: -1 }, name: 'idx_rewards_user_created' },
    { key: { orderId: 1 }, name: 'idx_rewards_order' },
    { key: { type: 1, status: 1 }, name: 'idx_rewards_type_status' },
    // IDEMPOTENCY: enforce one award per (email, orderId, type). Partial
    // filter so legacy rows without orderId don't collide.
    {
      key: { email: 1, orderId: 1, type: 1 },
      unique: true,
      partialFilterExpression: { orderId: { $type: 'string' } },
      name: 'idx_rewards_idempotency',
    },
  ],

  // Transactional email observability
  email_sends: [
    // IDEMPOTENCY: enforce unique messageId only when set to a string.
    // `sparse` treats `null` as a value (so existing null rows collide);
    // a partial filter on string skips them safely.
    {
      key: { messageId: 1 },
      unique: true,
      partialFilterExpression: { messageId: { $type: 'string' } },
      name: 'idx_email_sends_message_id',
    },
    { key: { to: 1, createdAt: -1 }, name: 'idx_email_sends_to_created' },
    { key: { orderId: 1 }, sparse: true, name: 'idx_email_sends_order' },
    { key: { campaignId: 1 }, sparse: true, name: 'idx_email_sends_campaign' },
    { key: { emailType: 1, createdAt: -1 }, name: 'idx_email_sends_type_created' },
    { key: { status: 1, createdAt: -1 }, name: 'idx_email_sends_status_created' },
    { key: { template: 1, createdAt: -1 }, name: 'idx_email_sends_template_created' },
  ],

  // Resend webhook delivery ledger / idempotency
  resend_webhook_events: [
    { key: { svixId: 1 }, unique: true, sparse: true, name: 'idx_resend_webhooks_svix' },
    { key: { messageId: 1, createdAt: -1 }, sparse: true, name: 'idx_resend_webhooks_message' },
    { key: { status: 1, createdAt: -1 }, name: 'idx_resend_webhooks_status_created' },
  ],

  // Email suppressions from unsubscribes, bounces, and complaints
  email_suppressions: [
    { key: { email: 1, reason: 1 }, unique: true, name: 'idx_email_suppressions_email_reason' },
    { key: { active: 1, updatedAt: -1 }, name: 'idx_email_suppressions_active_updated' },
  ],

  unsubscribes: [
    { key: { email: 1 }, name: 'idx_unsubscribes_email' },
    { key: { unsubscribedAt: -1 }, name: 'idx_unsubscribes_at' },
  ],

  // Contact form submissions
  contact_messages: [
    { key: { createdAt: -1 }, name: 'idx_contact_created' },
    { key: { email: 1, createdAt: -1 }, name: 'idx_contact_email_created' },
    { key: { status: 1, createdAt: -1 }, name: 'idx_contact_status_created' },
  ],

  // Newsletter / unsubscribe
  newsletter_subscribers: [
    { key: { email: 1 }, unique: true, name: 'idx_newsletter_email' },
    { key: { unsubscribedAt: 1 }, sparse: true, name: 'idx_newsletter_unsubscribed' },
  ],
};

async function setupIndexes() {
  console.log('🔧 Setting up database indexes...\n');

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 5,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    for (const [collectionName, indexes] of Object.entries(INDEXES)) {
      console.log(`📁 Collection: ${collectionName}`);
      
      try {
        const collection = db.collection(collectionName);
        
        // Create indexes
        const result = await collection.createIndexes(indexes);
        
        console.log(`   Created/Updated ${result.indexesCreated?.length || 0} indexes`);
        
        // Log existing indexes
        const existingIndexes = await collection.indexes();
        console.log(`   Total indexes: ${existingIndexes.length}\n`);
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}\n`);
      }
    }

    // Verify critical indexes
    console.log('🔍 Verifying critical indexes...\n');
    
    const criticalChecks = [
      { collection: 'orders', index: 'id', expected: true },
      { collection: 'payment_records', index: 'metadata.orderId', expected: true },
      { collection: 'products', index: 'slug', expected: true },
    ];

    for (const check of criticalChecks) {
      const collection = db.collection(check.collection);
      const indexes = await collection.indexes();
      const hasIndex = indexes.some(idx => 
        JSON.stringify(idx.key) === JSON.stringify({ [check.index]: 1 })
      );
      
      if (hasIndex) {
        console.log(`   ✅ ${check.collection}.${check.index} - OK`);
      } else {
        console.log(`   ⚠️  ${check.collection}.${check.index} - MISSING`);
      }
    }

    console.log('\n✅ Database index setup complete!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  setupIndexes();
}

module.exports = { setupIndexes, INDEXES };
