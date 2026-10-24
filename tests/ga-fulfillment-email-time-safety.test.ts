
import {describe,it,expect} from 'vitest';
import {easternDisplayInput,easternInputToUtc} from '@/lib/pickup-eastern-time';
import {buildListUnsubscribeHeaders} from '@/lib/email/list-unsubscribe-headers';
describe('Georgia appointment time and unsubscribe header safety',()=>{
  it('round-trips Eastern appointment times',()=>{
    expect(easternInputToUtc('2026-11-02T13:00')).toBe('2026-11-02T18:00:00.000Z');
    expect(easternDisplayInput('2026-07-02T16:00:00.000Z')).toBe('2026-07-02T12:00');
  });
  it('rejects DST missing/repeated hours',()=>{
    expect(()=>easternInputToUtc('2026-03-08T02:30')).toThrow();
    expect(()=>easternInputToUtc('2026-11-01T01:30')).toThrow();
    expect(()=>easternInputToUtc('2026-02-30T12:00')).toThrow();
  });
  it('refuses injected and offsite unsubscribe headers',()=>{
    expect(buildListUnsubscribeHeaders('https://tasteofgratitude.shop/unsubscribe?token=abc')?.['List-Unsubscribe'])
      .toBe('<https://tasteofgratitude.shop/unsubscribe?token=abc>');
    expect(()=>buildListUnsubscribeHeaders('https://tasteofgratitude.shop/unsubscribe?token=abc\r\nBcc:x')).toThrow();
    expect(()=>buildListUnsubscribeHeaders('https://foreign.example/unsubscribe?token=abc')).toThrow();
  });
});
