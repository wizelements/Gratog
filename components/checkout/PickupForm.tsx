'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PickupData } from '@/stores/checkout';
import { Fulfillment } from '@/adapters/fulfillmentAdapter';

type PickupWindow = { startsAt: string; endsAt: string; cutoffAt: string; capacity: number };
type PickupLocation = { id: string; name: string; street: string; city: string; state: string; zip: string; instructions: string; windows: PickupWindow[] };
interface Props {
  data: PickupData;
  onChange: (data: Partial<PickupData>) => void;
  errors?: Record<string, string>;
  marketOnly?: boolean;
}
const easternDate = (value: string | Date) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export default function PickupForm({ data, onChange, errors = {}, marketOnly = false }: Props) {
  const [appointments, setAppointments] = useState<PickupLocation[]>([]);
  const [loadError, setLoadError] = useState(false);
  const markets = Fulfillment.pickupLocations();
  const mode = marketOnly ? 'market' : (data.mode || 'appointment');
  useEffect(() => {
    let live = true;
    fetch('/api/pickup-locations', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Pickup options unavailable');
        return response.json();
      }).then(result => { if (live) setAppointments(result.locations || []); })
      .catch(() => { if (live) setLoadError(true); });
    return () => { live = false; };
  }, []);
  const location = appointments.find(item => item.id === data.locationId);
  const market = markets.find(item => item.id === data.locationId);
  const [marketDates, setMarketDates] = useState<Date[]>([]);
  useEffect(() => {
    if (mode !== 'market' || !data.locationId) return;
    setMarketDates(Fulfillment.marketCalendar(data.locationId));
  }, [mode, data.locationId]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Pickup details</h3>
        <p className="text-sm text-gray-600">Choose an actual available location and appointment. We will send pickup instructions with your order confirmation.</p>
      </div>
      {!marketOnly && (
        <fieldset className="flex flex-wrap gap-3" aria-label="Pickup type">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border p-3">
            <input type="radio" name="pickup-type" checked={mode === 'appointment'} onChange={() => onChange({ mode: 'appointment', locationId: '', date: null })}/>
            Scheduled pickup (no market)
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border p-3">
            <input type="radio" name="pickup-type" checked={mode === 'market'} onChange={() => onChange({ mode: 'market', locationId: '', date: null })}/>
            Farmers market pickup
          </label>
        </fieldset>
      )}
      {marketOnly && <p className="rounded-lg bg-amber-50 p-3 text-sm">Your cart includes market-only items, so a market pickup is required.</p>}
      {mode === 'appointment' && (
        <>
          {!appointments.length && <p role="status" className="rounded-lg bg-stone-50 p-4 text-sm text-gray-700">
            {loadError ? 'Appointment pickup is temporarily unavailable.' : 'No non-market pickup appointments are currently available. You can check market pickup or local delivery.'}
          </p>}
          {appointments.length > 0 && (
            <>
              <div>
                <Label htmlFor="appointment-location">Pickup location *</Label>
                <Select value={data.locationId || ''} onValueChange={id => onChange({ mode: 'appointment', locationId: id, date: null })}>
                  <SelectTrigger id="appointment-location" className="mt-1"><SelectValue placeholder="Choose an available pickup point"/></SelectTrigger>
                  <SelectContent>{appointments.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name} — {item.city}, GA</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              {location && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <p className="font-semibold"><MapPin className="mr-1 inline h-4 w-4" />{location.name}</p>
                  <p>{location.street}, {location.city}, GA {location.zip}</p>
                  {location.instructions && <p className="mt-1">{location.instructions}</p>}
                </div>
              )}
              {location && (
                <div>
                  <Label htmlFor="appointment-date">Choose an appointment *</Label>
                  <Select value={data.date ? new Date(data.date).toISOString() : ''} onValueChange={date => onChange({ date: new Date(date) })}>
                    <SelectTrigger id="appointment-date" className="mt-1"><Calendar className="mr-2 h-4 w-4" /><SelectValue placeholder="Choose an available time"/></SelectTrigger>
                    <SelectContent>{location.windows.map(slot => (
                      <SelectItem key={slot.startsAt} value={slot.startsAt}>{easternDate(slot.startsAt)} – {easternDate(slot.endsAt)} ET</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </>
      )}
      {mode === 'market' && (
        <>
          <div>
            <Label htmlFor="market-pickup-location">Market location *</Label>
            <Select value={data.locationId || ''} onValueChange={id => onChange({ mode: 'market', locationId: id, date: null })}>
              <SelectTrigger id="market-pickup-location" className="mt-1"><SelectValue placeholder="Choose a scheduled market"/></SelectTrigger>
              <SelectContent>{markets.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
            {market && <p className="mt-2 text-sm text-gray-600">{market.address} · {market.hours}</p>}
          </div>
          {market && (
            <div>
              <Label htmlFor="market-pickup-date">Pickup date *</Label>
              <Select value={data.date ? new Date(data.date).toISOString() : ''} onValueChange={date => onChange({ date: new Date(date) })}>
                <SelectTrigger id="market-pickup-date" className="mt-1"><SelectValue placeholder="Choose an upcoming market date"/></SelectTrigger>
                <SelectContent>{marketDates.map(date => <SelectItem key={date.toISOString()} value={date.toISOString()}>{date.toLocaleDateString('en-US',{ weekday:'long',month:'long',day:'numeric' })}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
      {errors.locationId && <p role="alert" className="text-sm text-red-700">{errors.locationId}</p>}
      {errors.date && <p role="alert" className="text-sm text-red-700">{errors.date}</p>}
      <div>
        <Label htmlFor="pickup-notes">Pickup instructions (optional)</Label>
        <Textarea id="pickup-notes" maxLength={500} rows={2} className="mt-1" value={data.instructions || ''} onChange={e => onChange({ instructions: e.target.value })} placeholder="How can we help with your pickup?" />
      </div>
    </div>
  );
}
