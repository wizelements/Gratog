import {describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {getStorefrontProductBySlug,listStorefrontProducts} from '@/lib/repositories/storefront-catalog';
const row={id:'p1',square_catalog_id:'sq1',slug:'gel',name:'Gel',description:'Fresh',active:1,metadata_json:'{"category":"Sea Moss","tags":["fresh"],"images":["/gel.jpg"],"benefitStory":"Daily wellness support","ingredients":["Sea Moss","Ginger"],"benefits":["Wellness"]}',current_stock:2,created_at:'2026-01-01',updated_at:'2026-01-02'};
describe('storefront catalog repository',()=>{
 it('hydrates Square variation identity, cents, and storefront metadata',async()=>{const executor={get:vi.fn().mockResolvedValue(row),all:vi.fn().mockResolvedValue([{id:'v1',square_variation_id:'sqv1',name:'16oz',price_cents:1500,currency:'USD',active:1}])} as any;const product=await getStorefrontProductBySlug('gel',executor);expect(product).toMatchObject({id:'p1',priceCents:1500,inStock:true,benefitStory:'Daily wellness support',ingredients:['Sea Moss','Ginger'],benefits:['Wellness']});expect(product.variations[0].id).toBe('sqv1')});
 it('binds search text instead of interpolating it',async()=>{const all=vi.fn().mockResolvedValueOnce([]);await listStorefrontProducts({search:"x%' OR 1=1 --"},{all,get:vi.fn()} as any);expect(all.mock.calls[0][0]).toContain('LIKE ?');expect(all.mock.calls[0][0]).not.toContain('OR 1=1')});
});
