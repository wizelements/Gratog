import {beforeEach,describe,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({run:vi.fn()}));
vi.mock('@/lib/db/turso',()=>({getTursoConnection:()=>db}));
import {EVENT_TYPES,trackEvent,trackSquareEvent} from '@/lib/unified-analytics';
describe('append-only Turso analytics ledger',()=>{
 beforeEach(()=>vi.clearAllMocks());
 it('uses a fixed table and bound JSON payloads',async()=>{db.run.mockResolvedValue({rowsAffected:1});await expect(trackEvent(EVENT_TYPES.PRODUCT_VIEW,{productId:'p1'},{source:'test'})).resolves.toBe(true);expect(db.run.mock.calls[0][0]).toContain('INSERT INTO analytics_events');expect(db.run.mock.calls[0][0]).not.toContain('p1');expect(db.run.mock.calls[0]).toContain('{"productId":"p1"}');});
 it('maps Square event types without changing Square authority',async()=>{db.run.mockResolvedValue({rowsAffected:1});await trackSquareEvent('payment.updated',{id:'evt'});expect(db.run.mock.calls[0]).toContain(EVENT_TYPES.SQUARE_PAYMENT_COMPLETE);});
 it('fails closed without breaking the caller when telemetry storage is unavailable',async()=>{db.run.mockRejectedValue(new Error('offline'));await expect(trackEvent('x',{})).resolves.toBe(false);});
});
