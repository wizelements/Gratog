import { randomUUID } from 'node:crypto';
import { getTursoConnection } from '../db/turso';

function mapAccount(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    customerId: row.customer_id == null ? null : String(row.customer_id),
    credits: {
      balance: Number(row.points), lifetimeEarned: Number(row.lifetime_earned),
      lifetimeRedeemed: Number(row.lifetime_redeemed), pending: Number(row.pending_points)
    },
    tier: { current: row.tier, achievedAt: row.tier_achieved_at ? new Date(row.tier_achieved_at) : null,
      progress: { purchases: Number(row.progress_purchases), spent: Number(row.progress_spent_cents), credits: Number(row.lifetime_earned) } },
    stats: { lastEarnedAt: row.last_earned_at ? new Date(row.last_earned_at) : null,
      lastRedeemedAt: row.last_redeemed_at ? new Date(row.last_redeemed_at) : null, favoriteReward: row.favorite_reward },
    referrals: { code: row.referral_code, referredCount: Number(row.referred_count), referredBy: row.referred_by },
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: new Date(row.updated_at)
  };
}

const ACCOUNT_COLUMNS = `id,customer_id,points,lifetime_earned,lifetime_redeemed,pending_points,tier,
 tier_achieved_at,progress_purchases,progress_spent_cents,referral_code,referred_count,referred_by,
 favorite_reward,last_earned_at,last_redeemed_at,expires_at,created_at,updated_at`;

export function createRewardAccountRepository(connection = getTursoConnection()) {
  const getWhere = async (where, value) => mapAccount(await connection.get(
    `SELECT ${ACCOUNT_COLUMNS} FROM reward_accounts WHERE ${where} = ? LIMIT 1`, value));
  return {
    getByCustomerId: customerId => getWhere('customer_id', customerId),
    getById: id => getWhere('id', id),
    getByReferralCode: code => getWhere('referral_code', code),
    async create(customerId, options) {
      const now = options.now.toISOString();
      const id = options.id || randomUUID();
      await connection.run(`INSERT INTO reward_accounts
        (id,customer_id,points,lifetime_earned,tier,tier_achieved_at,referral_code,referred_by,last_earned_at,expires_at,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, id, customerId, options.signupBonus, options.signupBonus, 'seedling', now,
        options.referralCode, options.referredBy, now, options.expiresAt.toISOString(), now, now);
      return getWhere('id', id);
    },
    async changeBalance(customerId, delta, expiresAt, now = new Date()) {
      const result = await connection.run(`UPDATE reward_accounts SET
        points = points + ?, lifetime_earned = lifetime_earned + CASE WHEN ? > 0 THEN ? ELSE 0 END,
        lifetime_redeemed = lifetime_redeemed + CASE WHEN ? < 0 THEN -? ELSE 0 END,
        last_earned_at = CASE WHEN ? > 0 THEN ? ELSE last_earned_at END,
        last_redeemed_at = CASE WHEN ? < 0 THEN ? ELSE last_redeemed_at END,
        expires_at = ?, updated_at = ?
        WHERE customer_id = ? AND points + ? >= 0`, delta, delta, delta, delta, delta, delta, now.toISOString(),
        delta, now.toISOString(), expiresAt.toISOString(), now.toISOString(), customerId, delta);
      if (Number(result.rowsAffected) !== 1) throw new Error('Reward account not found or insufficient balance');
      return getWhere('customer_id', customerId);
    },
    async updateProgress(customerId, progress, tier, achievedAt, expiresAt, now = new Date()) {
      await connection.run(`UPDATE reward_accounts SET progress_purchases=?,progress_spent_cents=?,tier=?,
        tier_achieved_at=COALESCE(?,tier_achieved_at),expires_at=?,updated_at=? WHERE customer_id=?`,
        progress.purchases, progress.spent, tier, achievedAt?.toISOString() ?? null, expiresAt.toISOString(), now.toISOString(), customerId);
      return getWhere('customer_id', customerId);
    },
    async setFavorite(customerId, rewardType) { await connection.run('UPDATE reward_accounts SET favorite_reward=?,updated_at=? WHERE customer_id=?', rewardType, new Date().toISOString(), customerId); },
    async incrementReferrals(customerId) { await connection.run('UPDATE reward_accounts SET referred_count=referred_count+1,updated_at=? WHERE customer_id=?', new Date().toISOString(), customerId); },
    async setReferredBy(customerId, referrerId) { await connection.run('UPDATE reward_accounts SET referred_by=?,updated_at=? WHERE customer_id=?', referrerId, new Date().toISOString(), customerId); },
    async setReferralCode(customerId, code) { await connection.run('UPDATE reward_accounts SET referral_code=?,updated_at=? WHERE customer_id=?', code, new Date().toISOString(), customerId); },
    async delete(customerId) { await connection.run('DELETE FROM reward_accounts WHERE customer_id=?', customerId); },
    async expiringBefore(cutoff) { return (await connection.all(`SELECT ${ACCOUNT_COLUMNS} FROM reward_accounts WHERE expires_at<=? AND points>0 ORDER BY expires_at`, cutoff.toISOString())).map(mapAccount); },
    async top(limit) { return (await connection.all(`SELECT ${ACCOUNT_COLUMNS} FROM reward_accounts ORDER BY lifetime_earned DESC LIMIT ?`, Math.max(0, limit))).map(mapAccount); },
    async tierDistribution() { return connection.all('SELECT tier,count(*) AS count,sum(points) AS totalCredits FROM reward_accounts GROUP BY tier'); },
    async liability() { return connection.get('SELECT COALESCE(sum(points),0) AS totalBalance,COALESCE(sum(pending_points),0) AS totalPending FROM reward_accounts'); }
  };
}

export function getRewardAccountRepository() { return createRewardAccountRepository(); }
