import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasInventoryMutationAuthority } from '@/lib/inventory/internal-authority';
import { readFileSync } from 'node:fs';
afterEach(()=>vi.unstubAllEnvs());
describe('inventory-mutation authorization',()=>{
  it('rejects every caller with no configured production worker secret',()=>{
    vi.stubEnv('INVENTORY_INTERNAL_SECRET','');
    expect(hasInventoryMutationAuthority(new Headers())).toBe(false);
    expect(hasInventoryMutationAuthority(new Headers({authorization:'Bearer attack'}))).toBe(false);
  });
  it('rejects weak secrets even when supplied correctly',()=>{
    vi.stubEnv('INVENTORY_INTERNAL_SECRET','short');
    expect(hasInventoryMutationAuthority(new Headers({authorization:'Bearer short'}))).toBe(false);
  });
  it('accepts only an exact trusted worker credential',()=>{
    vi.stubEnv('INVENTORY_INTERNAL_SECRET','minimum-length-test-worker-secret-over-32-characters');
    const h=new Headers({authorization:'Bearer minimum-length-test-worker-secret-over-32-characters'});
    expect(hasInventoryMutationAuthority(h)).toBe(true);
    expect(hasInventoryMutationAuthority(new Headers({authorization:'Bearer wrong'}))).toBe(false);
    expect(hasInventoryMutationAuthority(new Headers({authorization:'Bearer minimum-length-test-worker-secret-over-32-charactersx'}))).toBe(false);
  });
  it('enforces authorization BEFORE locking, releasing or confirming stock',()=>{
    for(const action of ['lock','release','confirm']){
      const s=readFileSync('app/api/inventory/'+action+'/route.ts','utf8');
      expect(s).toContain('hasInventoryMutationAuthority(request.headers)');
      expect(s.indexOf('hasInventoryMutationAuthority(request.headers)'))
        .toBeLessThan(s.indexOf('RateLimit.check('));
    }
  });
});
