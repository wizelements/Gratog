import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readSquareLiveInventory, inventoryForVariation } from '../lib/square-live-inventory';
import { readApprovedSquareMenuStock, CURRENT_MENU } from '../lib/square-menu-stock';

const environment = { SQUARE_ACCESS_TOKEN: 'fake-test-token', SQUARE_LOCATION_ID: 'LOC_1', SQUARE_ENVIRONMENT: 'sandbox' };
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf-8');

describe('Square inventory is real, location-scoped and never invented', () => {
  it('reads each Square variation with state and location filtering', async () => {
    const calls: any[] = [];
    const fetcher = vi.fn(async (url: string, opts: any) => {
      calls.push({url,body:JSON.parse(opts.body)});
      return { ok:true, json: async()=>({ counts:[
        {catalog_object_id:'VAR_A',location_id:'LOC_1',state:'IN_STOCK',quantity:'16',calculated_at:'2026-10-30T14:00:00Z'},
        {catalog_object_id:'VAR_A',location_id:'OTHER',state:'IN_STOCK',quantity:'600'},
        {catalog_object_id:'VAR_B',location_id:'LOC_1',state:'SOLD',quantity:'100'},
        {catalog_object_id:'VAR_B',location_id:'LOC_1',state:'IN_STOCK',quantity:'0'},
      ] }) };
    });
    const counts = await readSquareLiveInventory(['VAR_A','VAR_B'],{env:environment,fetcher});
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('squareupsandbox.com/v2/inventory/counts/batch-retrieve');
    expect(calls[0].body.location_ids).toEqual(['LOC_1']);
    expect(counts.get('VAR_A').quantity).toBe(16);
    expect(counts.get('VAR_B').quantity).toBe(0);
    expect(inventoryForVariation(counts,{id:'NOT_REPORTED'})).toMatchObject({quantity:null,countStatus:'unknown'});
    expect(inventoryForVariation(counts,{id:'VAR_A',itemVariationData:{trackInventory:false}})).toMatchObject({quantity:null,countStatus:'unknown'});
  });

  it('paginates and chooses the latest count per variation',async()=>{
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ok:true,json:async()=>({counts:[{catalog_object_id:'A',location_id:'LOC_1',state:'IN_STOCK',quantity:'2',calculated_at:'2026-10-29'}],cursor:'PAGE2'})})
      .mockResolvedValueOnce({ok:true,json:async()=>({counts:[{catalog_object_id:'A',location_id:'LOC_1',state:'IN_STOCK',quantity:'1',calculated_at:'2026-10-30'}]})});
    const counts=await readSquareLiveInventory(['A'],{env:environment,fetcher});
    expect(counts.get('A').quantity).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('quarantines negative and invalid Square counts without making the full menu fail', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ counts: [
      {catalog_object_id:'OVERSOLD',location_id:'LOC_1',state:'IN_STOCK',quantity:'-6'},
      {catalog_object_id:'MALFORMED',location_id:'LOC_1',state:'IN_STOCK',quantity:'not-a-number'},
      {catalog_object_id:'GOOD',location_id:'LOC_1',state:'IN_STOCK',quantity:'12'},
    ]})}));
    const counts=await readSquareLiveInventory(['OVERSOLD','MALFORMED','GOOD'],{env:environment,fetcher});
    expect(inventoryForVariation(counts,{id:'OVERSOLD'})).toMatchObject({quantity:0,countStatus:'negative_on_hand'});
    expect(inventoryForVariation(counts,{id:'MALFORMED'})).toMatchObject({quantity:null,countStatus:'invalid'});
    expect(inventoryForVariation(counts,{id:'GOOD'})).toMatchObject({quantity:12,countStatus:'reported'});
    expect(counts.size).toBe(3);
  });

  it('never claims stock on Square errors or missing configuration',async()=>{
    await expect(readSquareLiveInventory(['A'],{env:{},fetcher:vi.fn()})).rejects.toThrow('SQUARE_INVENTORY_CONFIGURATION_REQUIRED');
    await expect(readSquareLiveInventory(['A'],{env:environment,fetcher:vi.fn(async()=>({ok:false}))})).rejects.toThrow('SQUARE_INVENTORY_READ_FAILED');
  });

  it('audits seven approved menu items and flags a retired Square item without inventing stock', async()=>{
    const objects = CURRENT_MENU.map((target,index)=>({
      type:'ITEM',id:'ITEM_'+index,item_data:{name:target.aliases[0],variations:[{
        id:'VAR_'+index,item_variation_data:{name:'16 oz bottle',track_inventory:true}
      }]}
    }));
    objects.push({type:'ITEM',id:'RETIRED',item_data:{name:'Peach Lemonade',variations:[]}} as any);
    const fetcher = vi.fn(async (url:string) => {
      if(url.includes('/v2/catalog/list')) return {ok:true,json:async()=>({objects})};
      return {ok:true,json:async()=>({counts:[{
        catalog_object_id:'VAR_0',location_id:'LOC_1',state:'IN_STOCK',quantity:'0'
      }]})};
    });
    const audit = await readApprovedSquareMenuStock({env:environment,fetcher});
    expect(audit.report).toHaveLength(7);
    expect(audit.report[0]).toMatchObject({status:'found',onHand:0,countStatus:'reported'});
    expect(audit.report[1]).toMatchObject({status:'unverified',onHand:null,countStatus:'unknown'});
    expect(audit.retired).toContainEqual({itemId:'RETIRED',name:'Peach Lemonade',archived:false});
    expect(audit.fullyVerified).toBe(false);
  });
  it('removes artificial 99-unit and 25-unit stock from checkout paths',()=>{
    const direct=read('app/api/storefront/square-catalog/route.ts');
    const inventory=read('lib/custom-inventory.js');
    const storefront=read('lib/storefront-products.js');
    expect(direct).toContain('await readSquareLiveInventory(variationIds)');
    expect(direct).not.toContain('stockQuantity: 99');
    expect(inventory).not.toContain("process.env.DEFAULT_PRODUCT_STOCK || 25");
    expect(inventory).toContain('const DEFAULT_STOCK = 0');
    expect(inventory).toContain('stockVerifiedAt');
    expect(inventory).toContain('stockSource');
    expect(storefront).toContain("Inventory verification is temporarily unavailable.");
  });
});
