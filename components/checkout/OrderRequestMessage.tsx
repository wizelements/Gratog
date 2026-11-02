'use client';

import { useRef, useState } from 'react';

type Props = {
  requestId: string;
  email: string;
};

export default function OrderRequestMessage({ requestId, email }: Props) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);
  const attemptId = useRef<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || saved || message.trim().length < 5) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    if (!attemptId.current) attemptId.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/order-requests/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, email, messageId: attemptId.current,
          message: message.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not save the message.');
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Message unavailable.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="message-order-heading" className="rounded-xl border border-emerald-200 bg-white p-5">
      <h3 id="message-order-heading" className="text-lg font-bold text-emerald-950">
        Questions about this request?
      </h3>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Send a message directly to the Taste of Gratitude order inbox. This is
        a secure website message—not a Square text message. Our team can follow up
        using the email on your request. Nothing here reserves stock or collects payment.
      </p>
      {saved ? (
        <div role="status" className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950">
          Your message was saved for our team. No SMS or payment was sent.
          You can send another question from the contact page.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label htmlFor="order-message" className="block text-sm font-semibold">
            Your message
          </label>
          <textarea id="order-message" value={message}
            onChange={event => { setMessage(event.target.value); attemptId.current = null; }}
            maxLength={2000} minLength={5} required rows={3}
            placeholder="Ask about your order, ingredients, pickup or delivery details…"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-stone-950"
          />
          <p className="text-xs text-stone-600">
            Reference: {requestId.slice(-12)} · Reply contact: {email}
          </p>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
          <button type="submit" disabled={busy || message.trim().length < 5}
            className="min-h-12 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Saving your message…' : 'Send website message'}
          </button>
        </form>
      )}
    </section>
  );
}
