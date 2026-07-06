'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { track } from '@/utils/analytics';

export default function RetentionForm({
  intent = 'email_signup',
  source = 'site',
  metadata = {},
  title = 'Join the weekly list',
  description = 'Get the next menu drop, pickup reminders, and first access to limited batches.',
  cta = 'Join the list',
  collectEmail = true,
  collectPhone = false,
  requireEmail = false,
  collectMessage = false,
  collectMarket = false,
  marketOptions: marketOptionsProp = [],
  defaultMarket = '',
  messagePlaceholder = 'Tell us what you are interested in.',
  compact = false,
  onSuccess,
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', website: '', marketId: defaultMarket || '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};
  const metadataKey = JSON.stringify(safeMetadata);
  const marketOptions = collectMarket && Array.isArray(marketOptionsProp) ? marketOptionsProp : [];
  const finalDefaultMarket = defaultMarket || '';

  useEffect(() => {
    track('lead_form_view', { intent, source, ...safeMetadata });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, source, metadataKey]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          intent,
          source,
          metadata: {
            ...safeMetadata,
            marketId: form.marketId || safeMetadata.marketId || safeMetadata.landingMarketId || null,
            path: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : undefined,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Please try again.');
      }
      track('lead_captured', {
        intent,
        source,
        hasEmail: Boolean(form.email),
        hasPhone: Boolean(form.phone),
        persisted: data.persisted !== false,
        marketId: form.marketId || safeMetadata.marketId || safeMetadata.landingMarketId || null,
        ...safeMetadata,
      });
      setSuccess(true);
      setForm({ name: '', email: '', phone: '', message: '', website: '', marketId: defaultMarket || '' });
      if (typeof onSuccess === 'function') onSuccess(data);
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 ${compact ? 'text-sm' : ''}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">You&apos;re on the list.</p>
            <p className="mt-1 text-emerald-800">We&apos;ll send the next menu drop, reminder, or follow-up for this request.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[1.5rem] border border-emerald-900/10 bg-white p-5 shadow-sm ${compact ? '' : 'sm:p-6'}`}>
      <div className={compact ? 'mb-3' : 'mb-5'}>
        <h3 className={`${compact ? 'text-base' : 'text-xl'} font-semibold text-stone-950`}>{title}</h3>
        <p className={`${compact ? 'mt-1 text-sm' : 'mt-2 text-base'} leading-6 text-stone-600`}>{description}</p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <input type="text" name="website" value={form.website} onChange={handleChange} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        {!compact && (
          <Input name="name" value={form.name} onChange={handleChange} placeholder="First name (optional)" autoComplete="given-name" />
        )}
        {collectEmail && (
          <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email address" autoComplete="email" required={!collectPhone || requireEmail} />
        )}
        {collectPhone && (
          <Input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Phone for menu texts" autoComplete="tel" required />
        )}
        {collectMarket && marketOptions.length > 0 && (
          <select
            name="marketId"
            value={form.marketId}
            onChange={handleChange}
            className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Any market / not sure yet</option>
            {marketOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        {collectMessage && (
          <Textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder={messagePlaceholder}
            rows={compact ? 3 : 4}
          />
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="h-11 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {cta}
        </Button>
        <p className="text-xs leading-5 text-stone-500">No spam. Reply STOP to opt out of texts when SMS automation is connected.</p>
      </form>
    </div>
  );
}
