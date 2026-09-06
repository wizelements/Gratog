import {beforeEach,describe,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({transactionAsync:vi.fn()}));
vi.mock('@/lib/db/turso',()=>({getTursoConnection:()=>db}));
import {debitPaidOrder,restockCancelledOrder} from '@/lib/inventory/turso-repository';
describe('inventory order-event invariants',()=>{
  beforeEach(()=>vi.clearAllMocks());
  const payload={orderId:'o1',items:[{productId:'p1',quantity:2}]};
  it('debits once inside the event-claim transaction',async()=>{const tx={run:vi.fn().mockResolvedValueOnce({rowsAffected:1}).mockResolvedValueOnce({rowsAffected:1})};db.transactionAsync.mockImplementation(async(cb:any)=>cb(tx));await expect(debitPaidOrder(payload)).resolves.toEqual({success:true,debited:1,skipped:false});expect(tx.run).toHaveBeenCalledTimes(2);});
  it('does not debit when the paid-order event was already claimed',async()=>{const tx={run:vi.fn().mockResolvedValue({rowsAffected:0})};db.transactionAsync.mockImplementation(async(cb:any)=>cb(tx));await expect(debitPaidOrder(payload)).resolves.toEqual({success:true,debited:0,skipped:true,reason:'already_processed'});expect(tx.run).toHaveBeenCalledOnce();});
  it('rejects the transaction instead of leaving a partial insufficient-stock debit',async()=>{const tx={run:vi.fn().mockResolvedValueOnce({rowsAffected:1}).mockResolvedValueOnce({rowsAffected:0})};db.transactionAsync.mockImplementation(async(cb:any)=>cb(tx));await expect(debitPaidOrder(payload)).rejects.toThrow('Insufficient inventory');});
  it('makes cancellation restock replay-safe',async()=>{const tx={run:vi.fn().mockResolvedValue({rowsAffected:0})};db.transactionAsync.mockImplementation(async(cb:any)=>cb(tx));await expect(restockCancelledOrder(payload)).resolves.toEqual({success:true,restocked:0,skipped:true,reason:'already_processed'});});
});
