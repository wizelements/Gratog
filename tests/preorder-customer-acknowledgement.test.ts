import { describe, expect, it, vi, beforeEach } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('@/lib/resend-email', () => ({ sendEmail: send }));
import {
  preorderAcknowledgementCopy,
  sendPreorderRequestAcknowledgement,
} from '@/lib/preorder/customer-acknowledgement';

const request = {
  _id: 'preorder_request_1234567890abcdef',
  productName: 'Melon Rita', quantity: 2,
  customer: { email: 'buyer@example.test', name: 'Buyer' },
  fulfillmentType: 'pickup_market',
  pickup: { locationId: 'serenbe', date: '2026-11-07' },
};

describe('Gratitude Concierge: email acknowledgement without Twilio', () => {
  beforeEach(() => { send.mockReset(); });
  it('explains preorder status, fulfillment request, and zero charge', () => {
    const copy = preorderAcknowledgementCopy(request);
    expect(copy.subject).toContain('preorder request received');
    expect(copy.text).toContain('2 × Melon Rita');
    expect(copy.text).toContain('farmers market pickup');
    expect(copy.text).toContain('No payment has been taken');
    expect(copy.text).toContain('not confirmed in-stock');
    expect(copy.text).toContain('reply to this email');
    expect(copy.text).not.toContain('Twilio');
  });
  it('sends transactional email with support replies; never includes SMS', async () => {
    send.mockResolvedValue({ success: true, provider: 'resend', messageId: 'email_verified' });
    const result = await sendPreorderRequestAcknowledgement(request);
    expect(result).toMatchObject({status:'sent_to_provider',provider:'resend'});
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to:'buyer@example.test',
      replyTo:'support@tasteofgratitude.shop',
      emailType:'order_status',
      template:'preorder_request_acknowledgement',
    });
    expect(JSON.stringify(send.mock.calls[0][0])).not.toMatch(/sms|telnyx|twilio|payment link/i);
  });
  it('never interprets legacy mock success as real email delivery', async () => {
    send.mockResolvedValue({ success:true,provider:'mock',messageId:'MOCK_fake'});
    const res=await sendPreorderRequestAcknowledgement(request);
    expect(res.status).toBe('unavailable');
  });
  it('never interprets provider failure as acknowledgement delivered', async () => {
    send.mockResolvedValue({ success:false,provider:'resend',error:'provider_unavailable'});
    const res=await sendPreorderRequestAcknowledgement(request);
    expect(res.status).toBe('unavailable');
  });
  it('never interprets provider acceptance as actual inbox delivery', async () => {
    send.mockResolvedValue({ success:true,provider:'resend',messageId:'message-123'});
    const res=await sendPreorderRequestAcknowledgement(request);
    expect(res).not.toHaveProperty('delivered');
    expect(res.status).toBe('sent_to_provider');
  });
});
