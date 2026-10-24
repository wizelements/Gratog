import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
describe('preorder operations release invariants',()=>{
  it('reserves future-batch capacity before creating an external payment link',()=>{
    const source=read('app/api/preorder/route.ts');
    expect(source).toContain('createCapacityBoundPreorder({');
    expect(source).toContain('PREORDER_SLOT_SKU');
    expect(source.indexOf('await createCapacityBoundPreorder('))
      .toBeLessThan(source.indexOf('await createPaymentLink('));
    expect(source).toContain('checkoutRequestId');
    expect(source).toContain('verifiedDemandItems');
    expect(source).toContain('waitlistAvailable');
  });
  it('keeps all payment-linked stock held after an ambiguous provider response',()=>{
    const source=read('app/api/preorder/route.ts');
    expect(source).toContain('paymentReviewState');
    expect(source).toContain('needs_provider_reconciliation');
    expect(source).toContain('paymentResult.success === false && !paymentLink?.id');
  });
  it('requires actual unique indexes for idempotency and production manifest queries',()=>{
    const schema=read('scripts/setup-database-indexes.js');
    expect(schema).toContain("name: 'idx_marketorders_checkout_request'");
    expect(schema).toContain("name: 'idx_marketorders_market_date_queue'");
    expect(schema).toContain("name: 'idx_preorder_waitlist_retention_ttl'");
    const core=read('lib/preorder/capacity.ts');
    expect(core).toContain("indexExists('idx_marketorders_checkout_request')");
  });
  it('keeps inventory limit and recipe editing behind authenticated inventory permissions and CSRF',()=>{
    const admin=read('app/api/admin/preorder-capacity/route.ts');
    expect(admin).toContain('withAdminMiddleware');
    expect(admin).toContain('PERMISSIONS.INVENTORY_ADJUST');
    expect(admin).toContain('CAPACITY_BELOW_HELD');
    const page=read('app/admin/preorder-capacity/page.tsx');
    expect(page).toContain('x-csrf-token');
    expect(page).toContain('preorder_slot');
  });
  it('does not count no-charge requests as paid/stock-reserved orders',()=>{
    const waiter=read('app/api/preorder/waitlist/route.ts');
    expect(waiter).toContain('raw?.consent !== true');
    expect(waiter).toContain('optInWaitlist !== true');
    expect(waiter).toContain('charged: false');
    expect(waiter).not.toContain('createPaymentLink');
    expect(waiter).not.toContain('createCapacityBoundPreorder');
    const ui=read('app/preorder/PreorderClientPage.tsx');
    expect(ui).toContain('This pickup batch is full.');
    expect(ui).toContain('Join no-charge waitlist');
  });
  it('pages every order and waitlist instead of fetching all 1,000 users at once',()=>{
    const ops=read('app/api/admin/preorder-operations/route.ts');
    const wait=read('app/api/admin/preorder-waitlist/route.ts');
    expect(ops).toContain('.limit(51)');
    expect(wait).toContain('.limit(51)');
    expect(wait).toContain("sort({ createdAt: 1, _id: 1 })");
  });
});
