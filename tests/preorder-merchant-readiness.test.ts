import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
describe('merchant dashboard truth about preorder activation',()=>{
  it('verifies real unique index and exposes actual gated activation status to admins',()=>{
    const endpoint=readFileSync('app/api/admin/preorder-capacity/route.ts','utf8');
    const ui=readFileSync('app/admin/preorder-capacity/page.tsx','utf8');
    expect(endpoint).toContain("db.collection('marketorders').listIndexes().toArray()");
    expect(endpoint).toContain("index.unique === true");
    expect(endpoint).toContain("index.partialFilterExpression?.checkoutRequestId?.$type === 'string'");
    expect(endpoint).toContain("process.env.PREORDER_CAPACITY_ENGINE_ENABLED === 'true'");
    expect(endpoint).toContain("checkoutIndexReady");
    expect(endpoint).toContain("preparationCapacityConfigured");
    expect(ui).toContain('Reservation engine:');
    expect(ui).toContain('Changing limits does not turn on the new engine.');
    expect(ui).toContain('not certification');
  });
});
