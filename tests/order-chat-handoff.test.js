import { describe, expect, it } from 'vitest';
import { buildOrderRequest, getOrderContacts, makeSmsHref, normalizeUSPhone } from '../lib/order-chat.js';

describe('Order handoff safety', () => {
  it('uses the approved primary number and only a valid distinct second number', () => {
    expect(getOrderContacts().map((contact) => contact.number))
      .toEqual(['+14047899960', '+14706633225']);
    expect(getOrderContacts('').map((contact) => contact.number)).toEqual(['+14047899960']);
    expect(getOrderContacts('4047899960')).toHaveLength(1);
    expect(getOrderContacts('404-555-0134').map((contact) => contact.number))
      .toEqual(['+14047899960', '+14045550134']);
    expect(getOrderContacts('abc')).toHaveLength(1);
    expect(normalizeUSPhone('1 (404) 789-9960')).toBe('+14047899960');
    expect(normalizeUSPhone('+44 20 7946 0000')).toBeNull();
  });

  it('creates a customer-initiated SMS message without claims of stock, payment or delivery', () => {
    const msg = buildOrderRequest({
      intent: 'delivery', name: 'Customer', items: '2 Calm Waters\n1 six-pack',
      location: 'Atlanta 30331', desiredDate: 'Saturday', notes: 'Contact me first',
    });
    expect(msg).toContain('Local delivery enquiry');
    expect(msg).toContain('Atlanta 30331');
    expect(msg).toContain('2 Calm Waters 1 six-pack');
    expect(msg).toContain('not a confirmed order or payment');
    const href = makeSmsHref('+1 (404) 789-9960', msg);
    expect(href).toMatch(/^sms:\+14047899960\?body=/);
    expect(decodeURIComponent(href.split('body=')[1])).toEqual(msg);
  });

  it('rejects unsafe SMS destinations and normalizes unknown request intents', () => {
    expect(makeSmsHref('000', 'hello')).toBeNull();
    expect(makeSmsHref('+14047899960', '')).toBeNull();
    expect(buildOrderRequest({ intent: '__proto__', name: 'A', items: 'B' }))
      .toContain('Custom preorder request');
  });
});
