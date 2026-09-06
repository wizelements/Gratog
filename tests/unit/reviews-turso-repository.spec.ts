import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const handles=vi.hoisted(()=>{const tx={all:vi.fn(),run:vi.fn()};const db={all:vi.fn(),get:vi.fn(),run:vi.fn(),transactionAsync:vi.fn(async(work:any)=>work(tx))};return{db,tx}});
vi.mock('@/lib/db/turso',()=>({getTursoConnection:()=>handles.db}));
import {archiveAndDeleteReviews,moderateReviews} from '@/lib/repositories/reviews';
describe('reviews Turso repository',()=>{beforeEach(()=>vi.clearAllMocks());it('uses a fixed moderation JSON update',async()=>{handles.db.run.mockResolvedValue({rowsAffected:2});expect(await moderateReviews(['a','b'],'approve','owner')).toBe(2);expect(handles.db.run.mock.calls[0][0]).toContain("'$.approved',1");expect(handles.db.run.mock.calls[0][0]).not.toContain('owner')});it('archives before delete in one transaction',async()=>{handles.tx.all.mockResolvedValue([{source_id:'abcdef123456',payload_json:'{}'}]);handles.tx.run.mockResolvedValue({rowsAffected:1});const result=await archiveAndDeleteReviews(['abcdef123456'],'owner');expect(result).toEqual({deleted:1,archived:1});expect(handles.tx.run).toHaveBeenCalledTimes(2)});});
