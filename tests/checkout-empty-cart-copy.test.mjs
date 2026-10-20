import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/checkout/CheckoutRoot.tsx',import.meta.url),'utf8');
test('checkout presents an accessible empty-cart message when it cannot progress',()=>{
 assert.match(source,/cart\.length === 0 && \(/);
 assert.match(source,/role="status"/);
 assert.match(source,/>Your cart is empty<\/p>/);
 assert.match(source,/Add products to your cart before continuing to checkout\./);
 assert.match(source,/Continue to Details/);
});
