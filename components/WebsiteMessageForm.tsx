'use client';

import { useRef, useState, type FormEvent } from 'react';

type ContactResult = { success?: boolean; id?: string; error?: string };

const inputClass =
  'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700';

/**
 * Customer-facing first-party contact form. Not SMS, not Square Messages.
 * Sends to the already existing durable /api/contact endpoint, which saves
 * the message before making a best-effort merchant notification.
 */
export default function WebsiteMessageForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Order or pickup question');
  const [requestRef, setRequestRef] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || savedId || !name.trim() || !email.trim() || !message.trim()) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const suffix = requestRef.trim() ? ' — reference ' + requestRef.trim().slice(0, 80) : '';
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: ('Website message: ' + subject + suffix).slice(0, 200),
          message: message.trim(),
          website,
        }),
      });
      const data: ContactResult = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.id) {
        throw new Error(data.error || 'We could not save your message. Please try again.');
      }
      setSavedId(data.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Message could not be saved. Please try again.');
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  if (savedId) {
    return (
      <section id="message-form" aria-live="polite" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
        <h2 className="text-xl font-bold text-emerald-950">Your message has been saved</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-950">
          Reference <strong>{savedId.slice(0, 8)}</strong>. We have recorded your website message
          for our team. We have not sent a Square text, reserved products or collected payment.
          Email notification delivery is not guaranteed; keep this reference for follow-up.
        </p>
        <button type="button" onClick={() => {
          setName(''); setEmail(''); setMessage(''); setRequestRef('');
          setSavedId(null); setError(''); setWebsite('');
        }} className="mt-4 rounded-full border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900">
          Send another message
        </button>
      </section>
    );
  }

  return (
    <section id="message-form" aria-labelledby="message-form-heading"
      className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-white p-6">
      <h2 id="message-form-heading" className="text-xl font-bold text-emerald-950">
        Send Taste of Gratitude a message
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Message our team right here—no extra page or account required.
        This is a saved website message, <strong>not Square SMS</strong>. We can respond
        by email after reviewing your question.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Your name *
            <input name="name" autoComplete="name" required maxLength={120}
              value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-semibold">Email for our reply *
            <input name="email" type="email" autoComplete="email" required maxLength={254}
              value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm font-semibold">What can we help with?
          <select value={subject} onChange={e => setSubject(e.target.value)} className={inputClass}>
            <option>Order or pickup question</option>
            <option>Delivery or Georgia shipping</option>
            <option>Sea moss, drinks or ingredients</option>
            <option>Market visit or preorder</option>
            <option>Something else</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Order reference (optional)
          <input name="requestRef" autoComplete="off" maxLength={80}
            placeholder="For an existing request" value={requestRef}
            onChange={e => setRequestRef(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-semibold">Your message *
          <textarea name="message" required minLength={5} maxLength={5000} rows={5}
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Tell us what you need and how we can help…" className={inputClass} />
        </label>
        <div className="sr-only" aria-hidden="true">
          <label>Leave this field blank<input tabIndex={-1} autoComplete="off"
            value={website} onChange={e => setWebsite(e.target.value)} /></label>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <button type="submit" disabled={busy || !name.trim() || !email.trim() || message.trim().length < 5}
          className="min-h-12 w-full rounded-full bg-emerald-800 px-6 py-3 font-bold text-white disabled:opacity-50">
          {busy ? 'Saving your message…' : 'Send message to our team'}
        </button>
      </form>
      <p className="mt-4 text-xs leading-5 text-stone-600">
        Never include card numbers or sensitive payment details. Sending a message does not place
        an order or reserve inventory. Approved Square payment links are sent separately.
      </p>
    </section>
  );
}
