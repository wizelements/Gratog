'use client';

import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Send, X } from 'lucide-react';
import { buildOrderRequest, normalizeUSPhone } from '@/lib/order-chat';

const INTENTS = [
  { id: 'preorder', label: 'Preorder / special batch' },
  { id: 'delivery', label: 'Ask about delivery' },
  { id: 'market', label: 'Market pickup question' },
];

export function OrderChatPanel({ embedded = false }) {
  const requestAttempt = useRef(null);
  const [intent, setIntent] = useState('preorder');
  const [name, setName] = useState('');
  const [items, setItems] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState(null);
  const phoneValid = Boolean(normalizeUSPhone(phone));
  const ready = name.trim().length > 0 && items.trim().length > 1 && phoneValid && contactConsent;
  const message = buildOrderRequest({ intent, name, items, desiredDate, location, notes });

  const sendRequest = async (event) => {
    event.preventDefault();
    if (!ready || submitting || response?.success) return;
    const fields = { intent, name: name.trim(), phone, items: items.trim(), desiredDate, location, notes, contactConsent, website };
    const fingerprint = JSON.stringify(fields);
    if (!requestAttempt.current || requestAttempt.current.fingerprint !== fingerprint) {
      requestAttempt.current = { fingerprint, requestId: crypto.randomUUID() };
    }
    setSubmitting(true);
    setResponse(null);
    try {
      const res = await fetch('/api/order-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, requestId: requestAttempt.current.requestId }),
      });
      const result = await res.json();
      if (res.ok && result.success === true) {
        setResponse({ success: true, text: result.message, reference: result.reference });
      } else {
        setResponse({ success: false, text: result.error || 'We could not verify the request. Please use our contact page.' });
      }
    } catch {
      setResponse({ success: false, text: 'We could not verify your message submission. Do not resubmit immediately; use our contact page.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={embedded ? 'rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg sm:p-8' : 'bg-white p-5 sm:p-6'}>
      <div className="rounded-2xl bg-emerald-950 px-4 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Order concierge</p>
        <p className="mt-2 text-lg font-semibold">Tell us what you have in mind.</p>
        <p className="mt-1 text-sm leading-6 text-emerald-50">We’ll help confirm what can be prepared, when, and how you can get it.</p>
      </div>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">
        Send one request here. Our website automatically notifies <strong>both Solomon and Jenneisha</strong> through our messaging service when it is available. We’ll follow up using your callback number. This is an enquiry, not a confirmed order.
      </div>
      <form className="mt-5 space-y-4" onSubmit={sendRequest}>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-stone-900">How can we help?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {INTENTS.map((option) => (
              <label key={option.id} className={`cursor-pointer rounded-xl border p-3 text-sm font-medium transition ${intent === option.id ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-400'}`}>
                <input type="radio" name="order-intent" value={option.id} checked={intent === option.id} onChange={() => setIntent(option.id)} className="mr-2 accent-emerald-700" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        {intent === 'market' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
            Ready to reserve and pay online for a market pickup? Use the existing <Link href="/preorder" className="font-bold underline underline-offset-2">secure market checkout</Link>. This message form is for questions and exceptions, not reservations.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-stone-800">
            Your name <span className="text-red-700">*</span>
            <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="First name is fine" className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 px-4 text-base text-stone-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Your callback number <span className="text-red-700">*</span>
            <input required type="tel" maxLength={25} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" placeholder="(404) 555-0123" className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 px-4 text-base text-stone-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Preferred date (optional)
            <input maxLength={80} value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} placeholder="e.g. Saturday, Nov 7" className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 px-4 text-base text-stone-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
        </div>
        <label className="block text-sm font-semibold text-stone-800">
          What would you like? Include quantities. <span className="text-red-700">*</span>
          <textarea required maxLength={600} rows={3} value={items} onChange={(event) => setItems(event.target.value)} placeholder="e.g. 2 Calm Waters, 1 SuppleMint, 1 four-pack" className="mt-1 block w-full resize-y rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label className="block text-sm font-semibold text-stone-800">
          {intent === 'delivery' ? 'City / ZIP for delivery eligibility' : 'Market or pickup area (optional)'}
          <input maxLength={100} value={location} onChange={(event) => setLocation(event.target.value)} placeholder={intent === 'delivery' ? 'City and ZIP only — no full address yet' : 'e.g. Serenbe or Browns Mill'} className="mt-1 block min-h-12 w-full rounded-xl border border-stone-300 px-4 text-base text-stone-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label className="block text-sm font-semibold text-stone-800">
          Additional details (optional)
          <textarea maxLength={400} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dietary questions, preferred time, anything else" className="mt-1 block w-full resize-y rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        </label>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-bold text-stone-900">Message preview</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-stone-700">{message}</pre>
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          <input required type="checkbox" checked={contactConsent} onChange={(event) => setContactConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" />
          <span>I agree to be contacted about this order enquiry at the number provided. This is not marketing signup.</span>
        </label>
        <label className="absolute -left-[10000px]" aria-hidden="true">
          Leave this field blank
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        {!ready && <p role="status" className="text-sm text-stone-600">Enter your name, callback phone number and requested items, then agree to contact.</p>}
        <button type="submit" disabled={!ready || submitting || Boolean(response?.success)} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 text-base font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
          <Send className="h-5 w-5" aria-hidden="true" />
          {submitting ? 'Sending your request…' : response?.success ? 'Request submitted' : 'Send request'}
        </button>
        {response && (
          <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm leading-6 ${response.success ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-stone-900'}`}>
            {response.text}
            {response.reference && <p className="mt-1 text-xs">Reference: {response.reference.slice(0, 8)}</p>}
            {!response.success && <p className="mt-2"><Link href="/contact" className="font-bold underline underline-offset-2">Contact our team</Link></p>}
          </div>
        )}
        <p className="text-xs leading-5 text-stone-600">
          Your request is automatically routed to both team phones when the messaging provider accepts it. We cannot guarantee handset delivery. Stock, scheduling and fees are confirmed separately; pay only through approved Square checkout. Never include payment card details.
        </p>
      </form>
    </div>
  );
}

export default function OrderChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/checkout') || pathname?.startsWith('/order-help')) return null;
  return (
    <div className="fixed bottom-24 right-4 z-[70] md:bottom-6 md:right-6">
      {open && (
        <div role="dialog" aria-modal="false" aria-labelledby="order-chat-heading" className="mb-3 max-h-[min(72vh,680px)] w-[min(94vw,440px)] overflow-y-auto overscroll-contain rounded-3xl border border-emerald-200 bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100 bg-white px-5 py-3">
            <h2 id="order-chat-heading" className="font-bold text-emerald-950">Chat about an order</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close order chat" className="rounded-full p-2 hover:bg-stone-100"><X className="h-5 w-5" /></button>
          </div>
          <OrderChatPanel />
        </div>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? 'Close order chat' : 'Chat about an order'} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 font-bold text-white shadow-xl hover:bg-emerald-900">
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
        {open ? 'Close' : 'Chat to order'}
      </button>
    </div>
  );
}
