'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CartItem } from '@/adapters/cartAdapter';
import type { ContactInfo, FulfillmentData } from '@/stores/checkout';
import { Button } from '@/components/ui/button';

type Props = {
  cart: CartItem[];
  contact: ContactInfo;
  fulfillment: FulfillmentData;
  onBack: () => void;
};

type Response = {
  requestId:string;
  merchandiseTotalCents:number;
  paymentStatus:'not_charged';
  message:string;
  squareTextUsPage:string|null;
  emailStatus?:string;
};

export default function SquareMessagesReview({cart,contact,fulfillment,onBack}: Props) {
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const attemptId = useRef<string|null>(null);
  const [error,setError] = useState('');
  const [result,setResult] = useState<Response|null>(null);

  const items = useMemo(() => {
    const totals = new Map<string,{slug:string;name:string;quantity:number;price:number}>();
    for (const line of cart) {
      const slug = String(line.slug || '').trim();
      if (!slug) continue;
      const previous = totals.get(slug);
      if (previous) previous.quantity += line.quantity;
      else totals.set(slug, {slug,name:line.name,quantity:line.quantity,price:line.price});
    }
    return Array.from(totals.values());
  },[cart]);

  const isMarketPickup = fulfillment.type === 'pickup' &&
    fulfillment.pickup?.locationId !== 'browns-mill';
  const detail = fulfillment.type === 'pickup'
    ? `Browns Mill area · ${fulfillment.pickup?.date?.toLocaleDateString('en-US') || 'Date not set'} · Mondays 12–5 (subject to confirmation)`
    : fulfillment.type === 'delivery'
    ? `Local delivery review · ${fulfillment.delivery?.address?.city || ''}, GA · ${fulfillment.delivery?.window || ''}`
    : `Georgia shipping review · ${fulfillment.shipping?.address?.city || ''}, GA`;

  async function submit() {
    if (!ack || inFlight.current || result) return;
    inFlight.current = true; setBusy(true); setError('');
    const requestId = attemptId.current || crypto.randomUUID();
    attemptId.current = requestId;
    try {
      if (items.length === 0) throw new Error('Your cart has no approved product identifiers. Review your cart.');
      const response = await fetch('/api/order-requests',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          requestId,
          items:items.map(line => ({slug:line.slug,quantity:line.quantity})),
          customer:{name:`${contact.firstName} ${contact.lastName}`.trim(),email:contact.email,phone:contact.phone},
          fulfillmentType:fulfillment.type,
          pickup: fulfillment.type === 'pickup'
            ? {locationId:fulfillment.pickup?.locationId,date:fulfillment.pickup?.date?.toISOString().slice(0,10)}
            : undefined,
          address:fulfillment.type === 'delivery' ? fulfillment.delivery?.address
            : fulfillment.type === 'shipping' ? fulfillment.shipping?.address : undefined,
          deliveryTimeSlot:fulfillment.type === 'delivery' ? fulfillment.delivery?.window : undefined,
          preorderAcknowledged:true,confirmedFulfillment:true,
          preorderTermsVersion:'2026-10-31',
        }),
      });
      const data=await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not save your order request.');
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save your request.');
    } finally {setBusy(false);inFlight.current=false;}
  }

  if (result) {
    const reference = result.requestId.slice(-12);
    return (
      <section aria-live="polite" className="space-y-5">
        <h2 className="text-2xl font-bold text-emerald-900">Your request was received</h2>
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6">
          Reference <strong>{reference}</strong>. No payment has been collected, and no inventory
          or pickup/delivery window has been reserved.
        </p>
        <h3 className="font-semibold">Next: Square Messages</h3>
        <p className="text-sm leading-6 text-stone-700">
          Please quote <strong>{reference}</strong> when contacting Taste of Gratitude.
          We'll verify the products, timing and final delivery/shipping fees before sending a
          secure Square payment link. The website has already saved your itemized request.
        </p>
        {result.squareTextUsPage ? (
          <a href={result.squareTextUsPage} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-800 px-6 py-3 font-semibold text-white">
            Continue to Square Text Us
          </a>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Square's direct Text Us handoff is not yet verified on this website.
            Your request is saved and our team has been notified. Check your email for an
            acknowledgement. You can also <Link href="/contact" className="underline">contact us</Link>
            {' '}with the reference above. No response time is guaranteed.
          </div>
        )}
        <button type="button" className="text-sm font-semibold text-emerald-900 underline"
          onClick={() => navigator.clipboard?.writeText(reference)}>Copy reference</button>
        <p className="text-xs text-stone-600">Request status: awaiting merchant review · Payment status: unpaid.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Review and request your order</h2>
      <p className="text-sm leading-6 text-stone-600">
        This is a no-charge order request, not immediate checkout. Taste of Gratitude will
        verify current stock or next-batch availability before confirming fulfillment and
        sending a Square payment link in your conversation.
      </p>
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="font-semibold">Requested items</h3>
        <ul className="mt-3 space-y-2">
          {items.map(line => <li className="flex justify-between gap-4 text-sm" key={line.slug}>
            <span>{line.quantity} × {line.name}</span><span>${(line.quantity * line.price).toFixed(2)}</span>
          </li>)}
        </ul>
        <p className="mt-3 border-t pt-3 text-xs text-stone-600">
          Display prices are estimates only. Merchant-approved prices, tax, delivery and shipping
          charges are confirmed before a payment request.
        </p>
      </div>
      <div className="rounded-xl bg-stone-50 p-4 text-sm">
        <p className="font-semibold">{detail}</p>
        <p className="mt-2">{contact.firstName} {contact.lastName} · {contact.email}</p>
        <button type="button" className="mt-3 font-semibold text-emerald-800 underline"
          onClick={onBack}>Edit details</button>
      </div>
      {isMarketPickup ? (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          Farmers market pickup uses our separate market preorder flow.
          {' '}<Link href="/preorder" className="font-semibold underline">Continue to market preorders</Link>.
        </div>
      ) : (
        <label className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}
            className="mt-1 h-4 w-4" />
          <span><strong>I understand this is an unreserved request and not a purchase.</strong>
          {' '}I confirm my items, selected fulfillment method and requested details.
          Final availability, schedule, fees and payment require merchant approval.</span>
        </label>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      <Button type="button" onClick={submit} disabled={!ack || isMarketPickup || busy || items.length===0}
        className="h-14 w-full bg-emerald-800 text-base font-semibold">
        {busy ? 'Saving your request…':'Submit order request — no payment'}
      </Button>
    </section>
  );
}
