import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { rateLimitByIp } from '@/lib/rate-limit';
import { sendOwnerAlert } from '@/lib/owner-alerts';
import { sendPreorderRequestAcknowledgement } from '@/lib/preorder/customer-acknowledgement';
import {
  OrderRequestValidationError,
  validatedRequest,
  verifiedSquareTextUsPage,
} from '@/lib/commerce/nonmarket-order-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const fail = (code: string, error: string, status = 422) =>
  NextResponse.json({success:false, code, error}, {status, headers});

export async function POST(request: NextRequest) {
  const throttle = await rateLimitByIp(request, 18);
  if (!throttle.ok) return fail('RATE_LIMITED', 'Too many requests. Please wait and try again.', 429);

  let body: unknown;
  try { body = await request.json(); } catch { return fail('INVALID_JSON', 'Invalid request.', 400); }
  let draft: ReturnType<typeof validatedRequest>;
  try {
    draft = validatedRequest(body);
  } catch (error) {
    if (error instanceof OrderRequestValidationError) return fail(error.code, error.message);
    return fail('ORDER_REQUEST_INVALID', 'Review your items and fulfillment details.');
  }

  const id = 'nonmarket_order_request_' + createHash('sha256')
    .update(draft.requestId + ':' + draft.customer.email).digest('hex');
  const immutable = JSON.stringify(draft);
  const immutableHash = createHash('sha256').update(immutable).digest('hex');
  const record = {
    ...draft,
    _id: id,
    requestHash: immutableHash,
    source: 'website_nonmarket_square_messages',
    squarePaymentId: null,
    squareOrderId: null,
    paymentLink: null,
    customerConversationStatus: 'not_started',
    createdAt: new Date(),
  };
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('nonmarket_order_requests');
    const existing = await collection.findOne({ _id: id });
    if (existing) {
      if (existing.requestHash !== immutableHash) return fail('IDEMPOTENCY_CONFLICT',
        'The request has changed. Start a new order request.', 409);
      return NextResponse.json({
        success:true, requestId:id, status:existing.status,
        paymentStatus: 'not_charged',
        squareTextUsPage:verifiedSquareTextUsPage(process.env.SQUARE_TEXT_US_HOSTED_URL),
        message:'This order request was already received. No charge was made.',
      }, {headers});
    }

    try { await collection.insertOne(record); } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const collision = await collection.findOne({ _id: id });
      if (!collision || collision.requestHash !== immutableHash)
        return fail('IDEMPOTENCY_CONFLICT', 'Start a new order request.', 409);
      return NextResponse.json({
        success:true, requestId:id, status:collision.status,
        paymentStatus:'not_charged',
        squareTextUsPage:verifiedSquareTextUsPage(process.env.SQUARE_TEXT_US_HOSTED_URL),
        message:'This order request was already received. No charge was made.',
      }, {headers});
    }

    let emailStatus: 'sent_to_provider' | 'unavailable' = 'unavailable';
    try {
      const ack = await sendPreorderRequestAcknowledgement({
        _id:id, productName:'Bottled products', quantity:draft.totalUnits,
        items:draft.items.map(line => ({ name:line.name, quantity:line.quantity })),
        customer:draft.customer,
        fulfillmentType:draft.fulfillmentType,
      });
      emailStatus = ack.status;
      await collection.updateOne({_id:id}, {$set:{
        'customerContact.email.status': ack.status,
        'customerContact.email.provider': ack.provider,
        'customerContact.email.messageId': ack.status === 'sent_to_provider' ? ack.messageId : null,
        'customerContact.email.deliveryVerified':false,
        'customerContact.email.attemptedAt':new Date(),
      }});
    } catch {
      await collection.updateOne({_id:id}, {$set:{
        'customerContact.email.status':'unavailable',
        'customerContact.email.deliveryVerified':false,
        'customerContact.email.attemptedAt':new Date(),
      }}).catch(() => undefined);
    }

    try {
      await sendOwnerAlert({
        sourceEventId:id,
        category:'fresh_batch',
        severity:emailStatus === 'unavailable' ? 'warning':'info',
        title:emailStatus === 'unavailable'
          ? 'CUSTOMER CONTACT NEEDS ATTENTION — new website order request'
          : 'New multi-item website order request',
        body:'Request ' + id.slice(-12) + ' / ' + draft.items.map(x => `${x.quantity} × ${x.name}`).join(', ') +
          ' / ' + draft.fulfillmentType + ' / not charged. Confirm capacity and exact fees, then contact customer in Square Messages.',
        actionUrl:'https://tasteofgratitude.shop/admin',
        channel:'all',
        eventAt:new Date().toISOString(),
        metadata:{requestId:id,fulfillmentType:draft.fulfillmentType,items:draft.items.length},
      });
    } catch { /* persist request even when merchant notifications need retry */ }

    return NextResponse.json({
      success:true,
      requestId:id,
      merchandiseTotalCents:draft.merchandiseTotalCents,
      status:draft.status,
      paymentStatus:'not_charged',
      emailStatus,
      squareTextUsPage:verifiedSquareTextUsPage(process.env.SQUARE_TEXT_US_HOSTED_URL),
      message:'Your request is saved, not paid or reserved. Taste of Gratitude will confirm stock, scheduling and final charges before providing a Square payment link.',
    }, {status:201,headers});
  } catch {
    return fail('REQUEST_UNAVAILABLE', 'Order request service is temporarily unavailable. No payment was made.',503);
  }
}
