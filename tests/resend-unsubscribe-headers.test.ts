import { describe, expect, it } from 'vitest';
import { buildListUnsubscribeHeaders } from '@/lib/email/unsubscribe-headers';

describe('RFC 8058 unsubscribe headers', () => {
  it('creates safe one-click headers for an HTTPS link with encoded token', () => {
    expect(buildListUnsubscribeHeaders('https://tasteofgratitude.shop/unsubscribe?token=a%2Bb')).toEqual({
      'List-Unsubscribe': '<https://tasteofgratitude.shop/unsubscribe?token=a%2Bb>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });

  it('omits the headers when not requested', () => {
    expect(buildListUnsubscribeHeaders(undefined)).toBeUndefined();
  });

  it.each([
    'https://tasteofgratitude.shop/unsubscribe?token=ok\r\nBcc:someone@example.com',
    'https://tasteofgratitude.shop/\u0000unsubscribe',
    'https://tasteofgratitude.shop/unsubscribe\n',
    ' https://tasteofgratitude.shop/unsubscribe',
    'http://tasteofgratitude.shop/unsubscribe',
    'javascript:alert(1)',
    'https://user:pass@tasteofgratitude.shop/unsubscribe',
    'https://tasteofgratitude.shop/unsubscribe#fragment',
    'not-a-url',
  ])('rejects unsafe unsubscribe URI %s', (url) => {
    expect(() => buildListUnsubscribeHeaders(url)).toThrow();
  });
});
