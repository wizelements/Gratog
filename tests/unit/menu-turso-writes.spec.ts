import { beforeEach,describe,expect,it,vi } from 'vitest';
const db=vi.hoisted(()=>({all:vi.fn(),run:vi.fn(),transactionAsync:vi.fn()}));
vi.mock('@/lib/db/turso',()=>({getTursoConnection:()=>db}));
import { createTursoMenu,setActiveTursoMenu } from '@/lib/menus/turso-repository';

describe('Turso menu writes',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('creates parent and relations in one transaction',async()=>{
    const tx={run:vi.fn().mockResolvedValue({rowsAffected:1})};
    db.transactionAsync.mockImplementation(async(callback:any)=>callback(tx));
    db.all.mockResolvedValueOnce([{id:'m1',title:'Week',description:'',image_url:'x',thumbnail_url:null,canva_url:null,print_url:null,market_id:null,week_start:'2026-09-01T00:00:00.000Z',week_end:'2026-09-07T00:00:00.000Z',active:1,archived:0,created_at:'2026-09-01T00:00:00.000Z',updated_at:'2026-09-01T00:00:00.000Z'}]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await createTursoMenu({title:'Week',imageUrl:'x',weekStart:new Date('2026-09-01Z'),weekEnd:new Date('2026-09-07Z'),isActive:true,linkedProducts:['p1'],seasonalTags:['fall']});
    expect(db.transactionAsync).toHaveBeenCalledOnce();
    expect(tx.run.mock.calls.map((call:any[])=>call[0])).toEqual(expect.arrayContaining([expect.stringContaining('INSERT INTO menus'),expect.stringContaining('INSERT INTO menu_products'),expect.stringContaining('INSERT INTO menu_tags')]));
  });
  it('atomically deactivates the prior menu before activating the selected menu',async()=>{
    const tx={get:vi.fn().mockResolvedValue({id:'m2'}),run:vi.fn().mockResolvedValue({rowsAffected:1})};
    db.transactionAsync.mockImplementation(async(callback:any)=>callback(tx));
    db.all.mockResolvedValueOnce([]);
    await setActiveTursoMenu('m2');
    expect(tx.run).toHaveBeenCalledTimes(2);
    expect(tx.run.mock.calls[0][0]).toContain('active=0');
    expect(tx.run.mock.calls[1][0]).toContain('active=1');
  });
});
