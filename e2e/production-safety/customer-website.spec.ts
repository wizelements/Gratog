import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('**/api/**',async route=>{
    if(['POST','PUT','PATCH','DELETE'].includes(route.request().method())){
      // This suite certifies READS ONLY. Never create orders or charge cards.
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
});

for(const route of ['/', '/catalog', '/cart', '/contact']){
  test(`public customer page ${route} renders a real document without server failure`, async ({page})=>{
    const response=await page.goto(route,{waitUntil:'domcontentloaded'});
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
    expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(25);
    // Next App Router may stream metadata after DOMContentLoaded, especially
    // on mobile and on redirecting /cart. Poll for the actual title instead
    // of making a one-shot read that reports false missing metadata.
    await expect(page).toHaveTitle(/gratitude|taste/i,{timeout:15_000});
    await expect(page.locator('body')).not.toContainText(/Application error: a client-side exception/i);
  });
}
test('catalog has visible commerce content, not an error shell',async ({page})=>{
  const response=await page.goto('/catalog',{waitUntil:'domcontentloaded'});
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toContainText(/shop|catalog|drinks|products|juice/i,{timeout:20000});
  await expect(page.locator('body')).not.toContainText(/internal server error|an unexpected error occurred/i);
});
test('legacy order shortcut redirects to canonical checkout without generating an order',async({page})=>{
  await page.goto('/order',{waitUntil:'domcontentloaded'});
  expect(new URL(page.url()).pathname).toBe('/checkout');
  await expect(page.locator('body')).not.toContainText(/Internal Server Error/i);
});
