import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('No phantom Square inventory or one-cent purchasable placeholders',()=>{
 it('Square Catalog alone never invents stock, or marks unverified items as ready',()=>{
   const source=readFileSync('app/api/storefront/square-catalog/route.ts','utf8');
   expect(source).not.toMatch(/stockQuantity:\s*99/);
   expect(source).toContain('stockQuantity: selectedStock');
   expect(source).toContain('inventoryVerified: inventory.verified');
   expect(source).toContain('needsPriceReview: priceCents < 100');
   expect(source).toContain('available: inventory.verified');
 });
 it('market preorder client defaults missing stock to zero not a fake 99',()=>{
   const source=readFileSync('app/preorder/PreorderClientPage.tsx','utf8');
   expect(source).not.toMatch(/stockQuantity\s*\?\?\s*99/);
   expect(source).toContain('available: Number.isSafeInteger(p.stockQuantity)');
 });
});
