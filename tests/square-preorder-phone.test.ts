import { describe, expect, it } from 'vitest';
import { normalizeBuyerPhoneForSquare } from '@/lib/square-api';

describe('Square payment link phone prefill', () => {
  it('normalizes ordinary US checkout input', () => {
    expect(normalizeBuyerPhoneForSquare('(470) 555-0123')).toBe('+14705550123');
    expect(normalizeBuyerPhoneForSquare('4705550123')).toBe('+14705550123');
    expect(normalizeBuyerPhoneForSquare('1-470-555-0123')).toBe('+14705550123');
    expect(normalizeBuyerPhoneForSquare('+1 470 555 0123')).toBe('+14705550123');
  });
  it('omits unusable optional prefills instead of blocking payment', () => {
    expect(normalizeBuyerPhoneForSquare('')).toBeUndefined();
    expect(normalizeBuyerPhoneForSquare('123')).toBeUndefined();
    expect(normalizeBuyerPhoneForSquare('0005550123')).toBeUndefined();
    expect(normalizeBuyerPhoneForSquare('9999999999999')).toBeUndefined();
    expect(normalizeBuyerPhoneForSquare(undefined)).toBeUndefined();
  });
});
