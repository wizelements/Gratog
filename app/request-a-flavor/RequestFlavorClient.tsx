'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { track } from '@/utils/analytics';
import { PRODUCTS } from '@/data/products';

const FLAVOR_PROFILES = [
  { value: 'tropical', label: 'Tropical', hint: 'pineapple, mango, coconut' },
  { value: 'berry-forward', label: 'Berry-forward', hint: 'strawberry, blueberry, cranberry' },
  { value: 'citrus', label: 'Citrus', hint: 'lemon, lime, orange' },
  { value: 'ginger-forward', label: 'Ginger-forward', hint: 'spicy, warming, lively' },
  { value: 'mint-forward', label: 'Mint-forward', hint: 'cool, clean, crisp' },
  { value: 'herbal', label: 'Herbal', hint: 'basil, floral, botanical' },
  { value: 'creamy-coconut', label: 'Creamy or coconut-based', hint: 'smooth, rich, mellow' },
  { value: 'blue-spirulina', label: 'Blue spirulina', hint: 'ocean-blue, lightly sweet' },
  { value: 'surprise-me', label: 'Surprise me from an upcoming batch', hint: 'trust the season' },
];

const QUANTITY_OPTIONS = [
  { value: 'bottle_16oz', label: 'One 16 oz bottle', short: '1 bottle' },
  { value: 'multi_bottle', label: 'Multiple 16 oz bottles', short: 'Multiple bottles' },
  { value: 'half_gallon', label: 'Half gallon', short: '½ gallon' },
  { value: 'gallon', label: 'One gallon', short: '1 gallon' },
  { value: 'two_gallons', label: 'Two gallons', short: '2 gallons' },
  { value: 'three_plus_gallons', label: 'Three or more gallons', short: '3+ gallons' },
  { value: 'sample_interest', label: 'Interested in market samples only', short: 'Samples only' },
];

const MARKET_OPTIONS = [
  { value: 'serenbe', label: 'Serenbe Farmers Market — Saturdays 9am–1pm' },
  { value: 'dunwoody', label: 'Dunwoody Farmers Market — Saturdays 9am–12pm' },
];

interface RequestFlavorClientProps {
  source?: string;
}

interface FormState {
  email: string;
  phone: string;
  requestedProductSlug: string;
  flavorProfile: string;
  requestedFlavorText: string;
  quantity: string;
  quantityUnit: string;
  preferredMarketId: string;
  needByDate: string;
  notes: string;
  marketingEmailConsent: boolean;
  smsConsent: boolean;
}

export default function RequestFlavorClient({ source = 'homepage_hero' }: RequestFlavorClientProps) {
  const [form, setForm] = useState<FormState>({
    email: '',
    phone: '',
    requestedProductSlug: '',
    flavorProfile: '',
    requestedFlavorText: '',
    quantity: '1',
    quantityUnit: 'bottle_16oz',
    preferredMarketId: 'serenbe',
    needByDate: '',
    notes: '',
    marketingEmailConsent: false,
    smsConsent: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const curatedOptions = useMemo(() => {
    return PRODUCTS.filter(
      (p) =>
        ['lemonades', 'refreshers', 'juices'].includes(p.category) &&
        p.inventoryStatus !== 'inactive'
    ).map((p) => ({ value: p.slug, label: p.name }));
  }, []);

  const updateField = (name: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const email = form.email.trim();
    if (!email) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email.';

    if (!form.requestedProductSlug && !form.flavorProfile && !form.requestedFlavorText.trim()) {
      errors.flavor = 'Please select a flavor, a profile, or describe what you want.';
    }

    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty < 1) errors.quantity = 'Quantity must be at least 1.';

    if (!form.preferredMarketId) errors.preferredMarketId = 'Please select a pickup market.';

    if (form.needByDate) {
      const min = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const selected = new Date(form.needByDate);
      if (selected < min) errors.needByDate = 'Need-by date must be at least 48 hours away.';
    }

    if (form.smsConsent && !form.phone.trim()) {
      errors.smsConsent = 'Please enter a phone number to receive SMS updates.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    const payload = {
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      requestedProductSlug: form.requestedProductSlug || null,
      flavorProfile: form.flavorProfile || null,
      requestedFlavorText: form.requestedFlavorText.trim() || null,
      quantity: Number(form.quantity),
      quantityUnit: form.quantityUnit,
      preferredMarketId: form.preferredMarketId,
      needByDate: form.needByDate || null,
      notes: form.notes.trim() || null,
      requestSource: source,
      marketingEmailConsent: form.marketingEmailConsent,
      smsConsent: form.smsConsent,
    };

    try {
      track('submit_flavor_request', { source });
      const response = await fetch('/api/fresh-batch/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Please try again.');
      }
      track('flavor_request_complete', { source, requestId: data.requestId });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      track('flavor_request_error', { source, error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold">Request received.</p>
            <p className="mt-2 text-emerald-800">
              We will confirm availability, price, and pickup details by email before any payment is requested.
            </p>
            <p className="mt-4">
              <Link href="/markets" className="inline-flex items-center gap-1 font-medium text-emerald-900 underline underline-offset-4">
                Find a market <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-800">
          Email <span aria-hidden="true" className="text-red-600">*</span>
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
        {fieldErrors.email && (
          <p id="email-error" className="mt-1.5 text-sm text-red-700" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="product" className="mb-1.5 block text-sm font-medium text-stone-800">
          Known flavor
        </label>
        <Select
          value={form.requestedProductSlug}
          onValueChange={(value) => updateField('requestedProductSlug', value)}
        >
          <SelectTrigger id="product" aria-label="Choose a known flavor">
            <SelectValue placeholder="Choose a flavor from our lineup" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No specific flavor</SelectItem>
            {curatedOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="flavorProfile" className="mb-1.5 block text-sm font-medium text-stone-800">
          Or choose a flavor profile
        </label>
        <Select
          value={form.flavorProfile}
          onValueChange={(value) => updateField('flavorProfile', value)}
        >
          <SelectTrigger id="flavorProfile" aria-label="Choose a flavor profile">
            <SelectValue placeholder="Choose a profile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No profile</SelectItem>
            {FLAVOR_PROFILES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label} — {p.hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="flavorText" className="mb-1.5 block text-sm font-medium text-stone-800">
          Or describe a flavor
        </label>
        <Input
          id="flavorText"
          name="requestedFlavorText"
          value={form.requestedFlavorText}
          onChange={(e) => updateField('requestedFlavorText', e.target.value)}
          placeholder="e.g., mango-pineapple lemonade"
        />
        {fieldErrors.flavor && (
          <p id="flavor-error" className="mt-1.5 text-sm text-red-700" role="alert">
            {fieldErrors.flavor}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium text-stone-800">
            Quantity <span aria-hidden="true" className="text-red-600">*</span>
          </label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={100}
            value={form.quantity}
            onChange={(e) => updateField('quantity', e.target.value)}
            aria-invalid={Boolean(fieldErrors.quantity)}
            aria-describedby={fieldErrors.quantity ? 'quantity-error' : undefined}
          />
          {fieldErrors.quantity && (
            <p id="quantity-error" className="mt-1.5 text-sm text-red-700" role="alert">
              {fieldErrors.quantity}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="quantityUnit" className="mb-1.5 block text-sm font-medium text-stone-800">
            Unit
          </label>
          <Select
            value={form.quantityUnit}
            onValueChange={(value) => updateField('quantityUnit', value)}
          >
            <SelectTrigger id="quantityUnit" aria-label="Quantity unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUANTITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label htmlFor="market" className="mb-1.5 block text-sm font-medium text-stone-800">
          Preferred pickup market <span aria-hidden="true" className="text-red-600">*</span>
        </label>
        <Select
          value={form.preferredMarketId}
          onValueChange={(value) => updateField('preferredMarketId', value)}
        >
          <SelectTrigger id="market" aria-label="Preferred pickup market">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MARKET_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.preferredMarketId && (
          <p id="market-error" className="mt-1.5 text-sm text-red-700" role="alert">
            {fieldErrors.preferredMarketId}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="needByDate" className="mb-1.5 block text-sm font-medium text-stone-800">
          Need-by date (optional)
        </label>
        <Input
          id="needByDate"
          name="needByDate"
          type="date"
          value={form.needByDate}
          onChange={(e) => updateField('needByDate', e.target.value)}
          aria-invalid={Boolean(fieldErrors.needByDate)}
          aria-describedby={fieldErrors.needByDate ? 'date-error' : undefined}
        />
        {fieldErrors.needByDate && (
          <p id="date-error" className="mt-1.5 text-sm text-red-700" role="alert">
            {fieldErrors.needByDate}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-stone-800">
          Notes (optional)
        </label>
        <Textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Tell us anything else — no medical or health claims, please."
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-stone-800">
          Phone (optional)
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>

      <fieldset className="rounded-xl border border-stone-200 p-4">
        <legend className="px-2 text-sm font-medium text-stone-700">Communication preferences</legend>
        <div className="mt-2 flex items-start gap-3">
          <input
            id="smsConsent"
            name="smsConsent"
            type="checkbox"
            checked={form.smsConsent}
            onChange={(e) => updateField('smsConsent', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-stone-300"
          />
          <label htmlFor="smsConsent" className="text-sm leading-5 text-stone-700">
            Send me text updates about this request. Standard rates may apply.
          </label>
        </div>
        {fieldErrors.smsConsent && (
          <p id="sms-error" className="mt-1.5 text-sm text-red-700" role="alert">
            {fieldErrors.smsConsent}
          </p>
        )}
        <div className="mt-3 flex items-start gap-3">
          <input
            id="marketingEmailConsent"
            name="marketingEmailConsent"
            type="checkbox"
            checked={form.marketingEmailConsent}
            onChange={(e) => updateField('marketingEmailConsent', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-stone-300"
          />
          <label htmlFor="marketingEmailConsent" className="text-sm leading-5 text-stone-700">
            Send me future fresh-batch and market updates by email.
          </label>
        </div>
      </fieldset>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-start gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>
            This is a request, not a confirmed order. We will email you once the batch is approved and
            before any payment is requested.
          </span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-stone-900 text-white hover:bg-stone-800"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Sending request…
          </>
        ) : (
          <>Submit request</>
        )}
      </Button>
    </form>
  );
}
