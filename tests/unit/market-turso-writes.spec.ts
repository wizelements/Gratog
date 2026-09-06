import {beforeEach,describe,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({get:vi.fn(),run:vi.fn(),transactionAsync:vi.fn()}));
vi.mock('@/lib/db/turso',()=>({getTursoConnection:()=>db}));
import {seedTursoMarkets,updateTursoMarket} from '@/lib/markets/turso-repository';
const market={name:'Test',address:'1 Main',city:'Atlanta',state:'GA',zip:'30303',lat:1,lng:2,hours:'09:00-12:00',dayOfWeek:6,description:'Test'};
describe('Turso market writes',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('seeds only an empty target in one transaction',async()=>{const tx={run:vi.fn().mockResolvedValue({rowsAffected:1})};db.get.mockResolvedValue({count:0});db.transactionAsync.mockImplementation(async(cb:any)=>cb(tx));await expect(seedTursoMarkets([market])).resolves.toEqual({seeded:1});expect(tx.run).toHaveBeenCalledOnce();});
  it('does not seed over existing market data',async()=>{db.get.mockResolvedValue({count:1});await expect(seedTursoMarkets([market])).resolves.toEqual({seeded:0});expect(db.transactionAsync).not.toHaveBeenCalled();});
  it('binds allowlisted update values',async()=>{db.run.mockResolvedValue({rowsAffected:0});await updateTursoMarket('m1',{isActive:false,name:'New'});expect(db.run.mock.calls[0][0]).toContain('active=?');expect(db.run.mock.calls[0]).toContain('m1');});
});
