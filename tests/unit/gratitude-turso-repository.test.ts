import { describe, expect, test, vi } from 'vitest';
vi.mock('@/lib/db/turso', () => ({ getTursoConnection: vi.fn() }));
import { createRewardAccountRepository } from '@/lib/gratitude/turso-repository';

describe('Turso reward account repository', () => {
  test('maps SQL rows to the established account contract', async () => {
    const row = { id:'ra1',customer_id:'c1',points:75,lifetime_earned:100,lifetime_redeemed:25,pending_points:0,
      tier:'sprout',tier_achieved_at:null,progress_purchases:2,progress_spent_cents:2500,referral_code:'REF1',
      referred_count:1,referred_by:null,favorite_reward:null,last_earned_at:null,last_redeemed_at:null,
      expires_at:null,created_at:'2026-01-01T00:00:00.000Z',updated_at:'2026-01-02T00:00:00.000Z' };
    const db = { get: vi.fn().mockResolvedValue(row) };
    const account = await createRewardAccountRepository(db as never).getByCustomerId('c1');
    expect(account?.credits).toEqual({ balance:75,lifetimeEarned:100,lifetimeRedeemed:25,pending:0 });
    expect(account?.tier.progress).toEqual({ purchases:2,spent:2500,credits:100 });
  });

  test('guards balance mutations against overdrafts', async () => {
    const db = { run: vi.fn().mockResolvedValue({ rowsAffected:0 }), get: vi.fn() };
    const repository = createRewardAccountRepository(db as never);
    await expect(repository.changeBalance('c1', -100, new Date('2026-02-01'), new Date('2026-01-01')))
      .rejects.toThrow('insufficient balance');
    expect(db.run.mock.calls[0][0]).toContain('points + ? >= 0');
  });
});
