/**
 * Transactional only. This acknowledgement is NOT a payment request,
 * confirmed reservation, delivery guarantee, or promotional subscription.
 * No SMS/Twilio fallback: Resend email and merchant-alert queue only.
 */
import { sendEmail } from '@/lib/resend-email';
import { EMAIL_SENDERS } from '@/lib/email-config';

type ContactRequest = {
  _id: string;
  productName: string;
  quantity: number;
  customer: { email: string; name: string };
  fulfillmentType: string;
  pickup?: { locationId?: string; date?: string };
  deliveryTimeSlot?: string;
};

export function preorderAcknowledgementCopy(r: ContactRequest) {
  // Use only server-validated catalog and pickup fields; no raw HTML is
  // interpolated. The text form has no HTML input surface.
  const reference = r._id.slice(-12);
  const methodLabels: Record<string, string> = {
    pickup: 'scheduled pickup',
    pickup_market: 'farmers market pickup',
    pickup_dunwoody: 'farmers market pickup',
    delivery: 'local delivery (subject to approval)',
    shipping: 'Georgia shipping eligibility review',
  };
  const fulfillment = methodLabels[r.fulfillmentType] || 'fulfillment review';
  const subject = `Taste of Gratitude preorder request received — ${reference}`;
  const text = [
    'Taste of Gratitude — PREORDER REQUEST RECEIVED',
    '',
    `Reference: ${reference}`,
    `Requested: ${r.quantity} × ${r.productName}`,
    `Selected method: ${fulfillment}`,
    '',
    'This is a REQUEST, not confirmed in-stock inventory or a reserved batch.',
    'No payment has been taken. Production capacity, schedule, and delivery or pickup eligibility must be confirmed before any payment link is sent.',
    'If this does not work for you, reply to this email with CHANGE or CANCEL and your reference.',
    'Replies go to Taste of Gratitude support. This acknowledgement is automated and does not mean a staff member is immediately available.',
  ].join('\n');
  return { subject, text, reference, fulfillment };
}

export async function sendPreorderRequestAcknowledgement(r: ContactRequest) {
  const msg = preorderAcknowledgementCopy(r);
  const result = await sendEmail({
    to: r.customer.email,
    from: EMAIL_SENDERS.orders.formatted,
    replyTo: EMAIL_SENDERS.support.address,
    subject: msg.subject,
    text: msg.text,
    emailType: 'order_status',
    template: 'preorder_request_acknowledgement',
    customerEmail: r.customer.email,
    metadata: { preorderRequestId: r._id, transactional: true, paymentStatus: 'not_charged' },
  });
  if (!result?.success || result.provider !== 'resend' || !result.messageId) {
    // The legacy helper returns success:true in mock mode. Never treat that
    // as verified delivery or a successful external send.
    return { status: 'unavailable' as const, provider: result?.provider || null,
      error: result?.error || 'provider_not_confirmed' };
  }
  return { status: 'sent_to_provider' as const,
    provider: 'resend', messageId: String(result.messageId) };
}
