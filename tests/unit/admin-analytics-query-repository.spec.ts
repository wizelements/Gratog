import { beforeEach,describe,expect,it,vi } from 'vitest';
const db=vi.hoisted(()=>({all:vi.fn(),get:vi.fn()}));
vi.mock('server-only',()=>({}),{virtual:true});
vi.mock('@/lib/db/turso',()=>({getTursoConnection:()=>db}));
import { queryAdminAnalytics } from '@/lib/admin/analytics-query-repository';

describe('protected admin analytics queries',()=>{
  beforeEach(()=>vi.clearAllMocks());
  const start=new Date('2026-01-01T00:00:00Z'),end=new Date('2026-02-01T00:00:00Z');
  it('binds range and limit while converting sales cents at output',async()=>{
    db.all.mockResolvedValue([{period:'2026-01',orders:2,cents:1234,average_cents:617}]);
    await expect(queryAdminAnalytics('sales',start,end,'month',10)).resolves.toEqual([{_id:'2026-01',sales:12.34,orders:2,averageOrderValue:6.17}]);
    expect(db.all.mock.calls[0].slice(1)).toEqual([start.toISOString(),end.toISOString(),10]);
  });
  it('returns order status and fulfillment distributions',async()=>{
    db.all.mockResolvedValueOnce([{_id:'paid',count:2,cents:1000}]).mockResolvedValueOnce([{_id:'pickup',count:2}]);
    const result=await queryAdminAnalytics('orders',start,end,'day',5) as any;
    expect(result.byStatus[0]).toEqual({_id:'paid',count:2,total:10});
    expect(result.byFulfillment).toEqual([{_id:'pickup',count:2}]);
  });
  it('uses normalized relational order items for product analytics',async()=>{
    db.all.mockResolvedValue([{_id:'p1',name:'Gel',quantity:3,cents:2400}]);
    const result=await queryAdminAnalytics('products',start,end,'day',5) as any[];
    expect(result[0]).toEqual({_id:'p1',name:'Gel',quantity:3,revenue:24});
    expect(db.all.mock.calls[0][0]).toContain('order_items JOIN orders');
  });
});
