import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('app/api/admin/markets/route.ts','utf8');
const repo=readFileSync('lib/markets/repository.ts','utf8');

test('all market administration routes require the same revocation-aware identity before database operations',()=>{
  assert.doesNotMatch(source,/import\s*\{\s*requireAdmin\s*\}\s*from\s*['"]@\/lib\/admin-session['"]/);
  assert.match(source,/from\s*['"]@\/lib\/auth\/unified-admin['"]/);
  for(const method of ['GET','POST','PUT','DELETE']){
    const section=source.match(new RegExp(`export async function ${method}\\([^]*?(?=\\nexport async function |$)`))?.[0];
    assert.ok(section,`missing ${method} route`);
    assert.match(section,/try\s*\{[^]*?const admin = await requireAdminSession\(request\)/,
      `${method} must database-revalidate inside guarded error handler`);
    assert.doesNotMatch(section,/await requireAdmin\(request\)/,
      `${method} may not trust JWT-only secondary session`);
    const mutation=section.search(/await (?:getAllMarkets|createMarket|updateMarket|deleteMarket)\(/);
    assert.ok(mutation > section.indexOf('await requireAdminSession(request)'),
      `${method} must authenticate before any market access`);
  }
});

test('Turso-selected market operations cannot fall through to Mongo',()=>{
  for(const fn of ['getAllMarkets','getActiveMarkets','getMarketById','createMarket','updateMarket','deleteMarket']){
    const section=repo.match(new RegExp(`export async function ${fn}\\([^]*?(?=\\nexport (?:async |type |interface )|$)`))?.[0];
    assert.ok(section,`missing ${fn}`);
    assert.match(section,/tursoPreviewSelected\(\)/);
    assert.ok(section.indexOf('tursoPreviewSelected()')<section.indexOf('connectToDatabase()'),
      `${fn} must route to Turso before Mongo access`);
  }
});
