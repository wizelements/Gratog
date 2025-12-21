/**
 * Initialize MongoDB Indexes for Rewards System
 * 
 * Run once after deployment:
 * node scripts/initialize-rewards-indexes.js
 * 
 * Creates indexes for:
 * - Email lookups (fast)
 * - Leaderboard queries (fast)
 * - Voucher redemption (fast)
 * - TTL expiration (automatic cleanup)
 */

import SecureRewardsSystem from '@/lib/rewards-secure.js';

async function main() {
  console.log('🚀 Starting rewards system index initialization...\n');

  try {
    console.log('Creating indexes...');
    await SecureRewardsSystem.initializeIndexes();
    console.log('\n✅ All indexes created successfully!\n');

    console.log('Indexes created:');
    console.log('  ✓ customerEmail (unique) - Fast email lookups');
    console.log('  ✓ xpPoints, totalStamps (compound) - Fast leaderboard queries');
    console.log('  ✓ totalStamps - Fast stamp counting');
    console.log('  ✓ createdAt - Retention policy support');
    console.log('  ✓ vouchers.id - Fast voucher lookups');
    console.log('  ✓ vouchers.id, vouchers.used (compound) - Fast redemption checks');
    console.log('  ✓ TTL indexes - Auto-cleanup of expired idempotency records\n');

    console.log('Expected performance improvements:');
    console.log('  📈 Email lookup: < 50ms (was: O(n))');
    console.log('  📈 Leaderboard query: < 500ms (was: O(n log n))');
    console.log('  📈 Voucher lookup: < 50ms (was: O(n))\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:');
    console.error(error);
    process.exit(1);
  }
}

main();
