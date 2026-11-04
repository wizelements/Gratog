import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { verifiedSquareSmsHref } from '../lib/square-messages-contact';
import { verifiedSquareTextUsPage } from '../lib/commerce/nonmarket-order-request';

const file = (path: string) => readFileSync(path, 'utf8');

describe('Square Messages independent storefront handoff', () => {
  it('does not invent a texting destination without merchant verification', () => {
    expect(verifiedSquareSmsHref(undefined, undefined)).toBeNull();
    expect(verifiedSquareSmsHref('+18005551234', 'false')).toBeNull();
    expect(verifiedSquareSmsHref('+14045551234', 'true')).toBeNull();
    expect(verifiedSquareTextUsPage('https://tasteofgratitude.shop')).toBeNull();
    expect(verifiedSquareTextUsPage('https://attacker.example')).toBeNull();
  });
  it('accepts only separately certified Square SMS and Square-hosted pages', () => {
    expect(verifiedSquareSmsHref('+18005551234', 'true')).toBe('sms:+18005551234');
    expect(verifiedSquareTextUsPage('https://tasteofgratitude.square.site/contact')).toBe('https://tasteofgratitude.square.site/contact');
  });
  it('keeps a visible, truthful contact fallback on the website and checkout', () => {
    const page = file('app/text-us/page.tsx');
    const button = file('components/WebsiteMessageButton.tsx');
    expect(page).toContain('Square\'s native Text Us button cannot be installed');
    expect(page).toContain('Send website message');
    expect(page).toContain('verifiedSquareSmsHref');
    expect(page).not.toContain('https://squareup.com/messages');
    expect(button).toContain('"/contact?source=message-us#send-message"');
    expect(button).toContain('smsHref ? "/text-us"');
    expect(page).toContain("redirect('/contact?source=message-us#send-message')");
    expect(button).not.toContain("'/checkout'");
    expect(button).not.toContain("'/order-request'");
  });
});
