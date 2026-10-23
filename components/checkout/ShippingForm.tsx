'use client';

import { useEffect, useRef, useState } from 'react';
import { ShippingData } from '@/stores/checkout';
import { CartItem } from '@/adapters/cartAdapter';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CarrierRate = {
  id: string; methodKey: string; carrier: string; serviceName: string;
  rate: number; estimatedDays: number;
};
interface Props {
  data: ShippingData;
  onChange: (data: Partial<ShippingData>) => void;
  items: CartItem[];
  errors?: Record<string, string>;
}

export default function ShippingForm({ data, onChange, items, errors = {} }: Props) {
  const [rates, setRates] = useState<CarrierRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const revision = useRef(0);
  const cartSignature = JSON.stringify(items.map(item => [item.productId, item.variationId, item.quantity]));
  useEffect(() => {
    revision.current++;
    setRates([]);
    onChange({ methodId: '', fee: undefined, methodLabel: undefined });
    // Changes to cart quantities invalidate previous carrier quotes.
  }, [cartSignature]);
  const changeAddress = (key: keyof ShippingData['address'], value: string) => {
    revision.current++;
    setRates([]);
    setQuoteError('');
    onChange({ address: { ...data.address, [key]: value }, methodId: '', fee: undefined, methodLabel: undefined });
  };
  const requestRates = async () => {
    const current = ++revision.current;
    setLoading(true); setRates([]); setQuoteError('');
    onChange({ methodId: '', fee: undefined, methodLabel: undefined });
    try {
      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: data.address, items: items.map(item => ({
          productId: item.productId || item.id,
          variationId: item.variationId || undefined,
          quantity: item.quantity,
        })) }),
      });
      const result = await response.json();
      if (current !== revision.current) return;
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to verify Georgia shipping.');
      if (!result.rates?.length) throw new Error('No shipping options are available for your cart.');
      setRates(result.rates);
    } catch (caught) {
      if (current === revision.current) setQuoteError(caught instanceof Error ? caught.message : 'Shipping unavailable.');
    } finally {
      if (current === revision.current) setLoading(false);
    }
  };
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Georgia shipping</h3>
        <p className="mt-1 text-sm text-gray-600">Shipping is only available for individually approved products that can safely travel by parcel. Enter your Georgia address to check live carrier services. Fresh or refrigerated items are not automatically eligible.</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="ship-street">Street address *</Label>
          <Input id="ship-street" value={data.address.street} onChange={e => changeAddress('street',e.target.value)} aria-invalid={!!errors['address.street']} className="mt-1"/>
          {errors['address.street'] && <p className="text-sm text-red-700">{errors['address.street']}</p>}
        </div>
        <div>
          <Label htmlFor="ship-suite">Apartment / Suite</Label>
          <Input id="ship-suite" value={data.address.suite || ''} onChange={e => changeAddress('suite',e.target.value)} className="mt-1"/>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="ship-city">City *</Label>
            <Input id="ship-city" value={data.address.city} onChange={e => changeAddress('city',e.target.value)} className="mt-1"/>
            {errors['address.city'] && <p className="text-sm text-red-700">{errors['address.city']}</p>}
          </div>
          <div>
            <Label htmlFor="ship-state">State *</Label>
            <Input id="ship-state" value="GA" readOnly className="mt-1 bg-stone-50"/>
            {errors['address.state'] && <p className="text-sm text-red-700">{errors['address.state']}</p>}
          </div>
          <div>
            <Label htmlFor="ship-zip">GA ZIP *</Label>
            <Input id="ship-zip" value={data.address.zip} inputMode="numeric" maxLength={5} onChange={e => changeAddress('zip',e.target.value.replace(/\D/g,'').slice(0,5))} className="mt-1"/>
            {errors['address.zip'] && <p className="text-sm text-red-700">{errors['address.zip']}</p>}
          </div>
        </div>
      </div>
      <Button type="button" disabled={loading || !data.address.street || !data.address.city || data.address.zip.length !== 5} onClick={requestRates} className="min-h-12 bg-emerald-700 hover:bg-emerald-800">
        {loading ? 'Checking carrier services…' : 'Check Georgia shipping options'}
      </Button>
      {quoteError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{quoteError}</p>}
      {rates.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Available verified carrier quotes *</legend>
          {rates.map(rate => (
            <label key={rate.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 hover:border-emerald-500">
              <input type="radio" name="carrier-rate" checked={data.methodId === rate.methodKey} onChange={() => onChange({
                methodId: rate.methodKey, fee: rate.rate,
                methodLabel: rate.carrier + ' ' + rate.serviceName,
              })}/>
              <span className="flex-1 text-sm">{rate.carrier} {rate.serviceName}<span className="block text-xs text-gray-600">Carrier estimate: {rate.estimatedDays} business days, plus preparation</span></span>
              <span className="font-semibold">${rate.rate.toFixed(2)}</span>
            </label>
          ))}
        </fieldset>
      )}
      {errors.methodId && <p role="alert" className="text-sm text-red-700">{errors.methodId}</p>}
    </div>
  );
}
