import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const handles=vi.hoisted(()=>{const tx={run:vi.fn()};const db={get:vi.fn(),all:vi.fn(),run:vi.fn(),transactionAsync:vi.fn(async(work:any)=>work(tx))};return{tx,db}});
vi.mock('@/lib/db/turso',()=>({getTursoConnection:()=>handles.db}));
vi.mock('@/lib/gratitude/accounts',()=>({getAccount:vi.fn()}));
import {earnFromActivity,earnFromPurchase,manualAdjustment} from '@/lib/gratitude/transactions';

describe('gratitude Turso transaction ledger',()=>{
 beforeEach(()=>{vi.clearAllMocks();handles.tx.run.mockResolvedValue({rowsAffected:1});handles.db.get.mockImplementation(async(sql:string)=>sql.includes('source_event_id')?null:{id:'a1',customer_id:'c1',points:10,lifetime_earned:10,progress_purchases:0,progress_spent_cents:0,tier:'seedling'});});
 it('commits purchase ledger, balance, and progress in one transaction',async()=>{const result=await earnFromPurchase({customerId:'c1',orderId:'o1',orderTotal:1000,tier:'seedling'});expect(result.success).toBe(true);expect(handles.db.transactionAsync).toHaveBeenCalledTimes(1);expect(handles.tx.run).toHaveBeenCalledTimes(3);expect(handles.tx.run.mock.calls[0]).toContain('purchase:c1:o1')});
 it('uses deterministic activity idempotency keys',async()=>{await earnFromActivity({customerId:'c1',activityType:'review',credits:10,description:'Review',metadata:{productId:'p1'}});expect(handles.tx.run.mock.calls[0]).toContain('review:c1:p1')});
 it('keeps manual adjustment and balance mutation atomic',async()=>{await manualAdjustment({customerId:'c1',credits:-5,reason:'correction',adminId:'owner'});expect(handles.db.transactionAsync).toHaveBeenCalledTimes(1);expect(handles.tx.run).toHaveBeenCalledTimes(2)});
});
