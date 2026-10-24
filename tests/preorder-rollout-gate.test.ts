import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
describe('production-safe capacity engine rollout', () => {
  it('defaults unconfigured markets to the existing live checkout', () => {
    const route = readFileSync('app/api/preorder/route.ts', 'utf8');
    const legacy = readFileSync('lib/preorder/legacy-route.ts', 'utf8');
    expect(route).toContain("process.env.PREORDER_CAPACITY_ENGINE_ENABLED !== 'true'");
    expect(route).toContain("import('@/lib/preorder/legacy-route')");
    expect(legacy).toContain('export async function POST(');
    expect(legacy).toContain('createPreorder(');
    expect(legacy).toContain('createPaymentLink(');
    const waitlist = readFileSync('app/api/preorder/waitlist/route.ts','utf8');
    expect(waitlist).toContain("process.env.PREORDER_CAPACITY_ENGINE_ENABLED !== 'true'");
    const ops = readFileSync('app/api/admin/preorder-operations/route.ts','utf8');
    expect(ops).toContain("queuePosition: { $gt: Number(after) }");
    expect(ops).toContain("sort({ queuePosition: 1, orderNumber: 1 })");
    expect(ops).toContain("capacityRequirements.sku': { $ne: 'preorder_slot'");
    expect(route.indexOf("PREORDER_CAPACITY_ENGINE_ENABLED !== 'true'"))
      .toBeLessThan(route.indexOf('const selectedMarket ='));
  });
});
