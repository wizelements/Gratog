'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { easternDisplayInput, easternInputToUtc } from '@/lib/pickup-eastern-time';
import { BROWNS_MILL_PICKUP, prepareBrownsMillMondayWindows } from '@/lib/browns-mill-pickup';

type Window = { startsAt: string; endsAt: string; cutoffAt: string; capacity: number };
type Location = { id?: string; name: string; street: string; city: string; state: 'GA'; zip: string; instructions: string; isActive: boolean; staffingConfirmed: boolean; addressVerified: boolean; windows: Window[] };
const empty: Location = { name: '', street: '', city: '', state: 'GA', zip: '', instructions: '', isActive: false, staffingConfirmed: false, addressVerified: false, windows: [] };
const toLocal = easternDisplayInput;
const toIso = easternInputToUtc;

export default function PickupLocationSettings() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<Location>(empty);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [brownsMillCapacity, setBrownsMillCapacity] = useState('');
  const [brownsMillCutoffHours, setBrownsMillCutoffHours] = useState('');
  const reload = useCallback(async () => {
    try {
      const response = await adminFetch<{locations: Location[]}>('/api/admin/pickup-locations', { skipCsrf: true });
      if (!response.success) throw Error('Unable to load locations');
      setLocations(response.data?.locations || []);
    } catch { setError('Unable to load pickup settings. Check your admin session.'); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const patch = (values: Partial<Location>) => setForm(previous => ({ ...previous, ...values }));
  const patchWindow = (index: number, values: Partial<Window>) =>
    setForm(previous => ({ ...previous, windows: previous.windows.map((window, i) => i === index ? { ...window, ...values } : window) }));
  const updateEasternTime = (index: number, key: 'startsAt'|'endsAt'|'cutoffAt', value: string) => {
    try { patchWindow(index,{[key]:toIso(value)}); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Invalid Eastern time'); }
  };

  const applyBrownsMillDraft = () => {
    setForm({
      ...empty,
      name: BROWNS_MILL_PICKUP.name,
      city: BROWNS_MILL_PICKUP.city,
    });
    setError('');
    setMessage('Browns Mill area and Monday hours prepared. A real authorized meeting address and capacity are still required before activation.');
  };
  const prepareMondayWindows = () => {
    try {
      const capacity = brownsMillCapacity.trim() ? Number(brownsMillCapacity) : NaN;
      const cutoff = brownsMillCutoffHours.trim() ? Number(brownsMillCutoffHours) : NaN;
      const windows = prepareBrownsMillMondayWindows(new Date(), capacity, cutoff);
      setForm(previous => ({ ...previous, windows, isActive: false, staffingConfirmed: false }));
      setError('');
      setMessage('Four future Monday windows prepared for 12:00–5:00 PM Eastern. They remain unpublished until you verify the address, staffing and capacity.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to prepare Monday windows');
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await adminFetch<{error?: string}>('/api/admin/pickup-locations', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      if (!response.success) throw new Error(response.data?.error || 'Settings were not saved');
      setMessage('Pickup location saved. Active locations show only while a confirmed, unexpired appointment is available.');
      setForm(empty);
      await reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save'); }
    finally { setBusy(false); }
  };
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <Link className="text-sm text-emerald-700 underline" href="/admin">← Admin dashboard</Link>
        <h1 className="mt-2 text-3xl font-bold">Non-market pickup</h1>
        <p className="mt-2 text-gray-600">Manage verified pickup addresses and exact appointments separately from farmers markets. New locations are hidden by default. All appointment times are Georgia Eastern Time, regardless of your device location. Missing and repeated daylight-saving times are rejected.</p>
      </div>
      <section aria-label="Configured pickup locations" className="space-y-2">
        <h2 className="text-xl font-semibold">Existing locations</h2>
        {locations.length === 0 && <p className="text-sm text-gray-500">No appointment pickup locations configured.</p>}
        {locations.map(location => (
          <button type="button" key={location.id} className="w-full rounded-lg border bg-white p-4 text-left hover:border-emerald-600" onClick={() => { setForm(location); setMessage(''); setError(''); }}>
            <span className="font-semibold">{location.name}</span> — {location.isActive ? 'Active' : 'Hidden'}
            <span className="block text-sm text-gray-600">{location.street}, {location.city}, GA {location.zip} · {location.windows.length} scheduled windows</span>
          </button>
        ))}
      </section>
      <form onSubmit={save} className="space-y-5 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">{form.id ? 'Edit' : 'Create'} pickup location</h2>
        {!form.id && (
          <section aria-label="Browns Mill pickup plan" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold">{BROWNS_MILL_PICKUP.name}</p>
            <p className="mt-1 text-sm">{BROWNS_MILL_PICKUP.hoursLabel}. General service area only, not a confirmed address or golf course partnership.</p>
            <p className="mt-1 text-sm">Booking remains closed until the exact authorized meeting point, staffing, capacity and cutoff are verified.</p>
            <button type="button" onClick={applyBrownsMillDraft} className="mt-3 rounded-md border border-emerald-600 px-3 py-2 text-sm font-semibold">
              Use Browns Mill area draft
            </button>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Verified maximum appointments per Monday
                <input type="number" min={1} max={100} value={brownsMillCapacity} onChange={event => setBrownsMillCapacity(event.target.value)}
                  placeholder="Enter actual capacity" className="mt-1 w-full rounded-md border p-2" />
              </label>
              <label className="text-sm font-medium">Order cutoff hours before pickup
                <input type="number" min={1} max={168} value={brownsMillCutoffHours} onChange={event => setBrownsMillCutoffHours(event.target.value)}
                  placeholder="Choose hours" className="mt-1 w-full rounded-md border p-2" />
              </label>
            </div>
            <button type="button" onClick={prepareMondayWindows}
              className="mt-3 rounded-md border border-emerald-600 px-3 py-2 text-sm font-semibold">
              Prepare next four Monday windows (unpublished)
            </button>
          </section>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {([['name','Public location name'],['street','Verified street address'],['city','City'],['zip','Georgia ZIP']] as const).map(([key,label]) => (
            <label key={key} className="block text-sm font-medium">{label}
              <input required value={form[key]} onChange={e=>patch({[key]:e.target.value})} className="mt-1 block w-full rounded-md border p-3" />
            </label>
          ))}
        </div>
        <label className="block text-sm font-medium">Customer arrival instructions
          <textarea value={form.instructions} onChange={e=>patch({instructions:e.target.value})} rows={2} maxLength={500} className="mt-1 block w-full rounded-md border p-3"/>
        </label>
        <div className="space-y-3">
          <h3 className="font-semibold">Confirmed appointment windows</h3>
          {form.windows.map((window, index) => (
            <div key={index} className="grid gap-2 rounded-lg bg-stone-50 p-3 sm:grid-cols-2">
              {([['startsAt','Starts'],['endsAt','Ends'],['cutoffAt','Order cutoff']] as const).map(([key,label]) => (
                <label key={key} className="text-sm">{label}
                  <input required type="datetime-local" value={toLocal(window[key])} onChange={e=>updateEasternTime(index,key,e.target.value)} className="mt-1 block w-full rounded-md border p-2"/>
                </label>
              ))}
              <label className="text-sm">Maximum appointments
                <input required type="number" min={1} max={100} value={window.capacity} onChange={e=>patchWindow(index,{capacity:Number(e.target.value)})} className="mt-1 block w-full rounded-md border p-2" />
              </label>
              <button type="button" onClick={()=>patch({windows:form.windows.filter((_,i)=>i!==index)})} className="text-left text-sm font-medium text-red-700 underline">Remove window</button>
            </div>
          ))}
          <button type="button" onClick={()=>patch({windows:[...form.windows, { startsAt: new Date(Date.now()+3*86400000).toISOString(), endsAt: new Date(Date.now()+3*86400000+3600000).toISOString(), cutoffAt:new Date(Date.now()+2*86400000).toISOString(),capacity:5 }]})} className="rounded-md border p-2 text-sm font-semibold">+ Add confirmed window</button>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.addressVerified || false}
            onChange={e=>patch({addressVerified:e.target.checked})} />
          I have authorization to publish this exact pickup address
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.staffingConfirmed || false}
            onChange={e=>patch({staffingConfirmed:e.target.checked})} />
          Staff availability and operating capacity are confirmed for these windows
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.isActive} onChange={e=>patch({isActive:e.target.checked})} />
          Publish this location and its available appointments
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {message && <p role="status" className="text-emerald-700">{message}</p>}
        <div className="flex gap-3">
          <button disabled={busy} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?'Saving…':'Save pickup location'}</button>
          {form.id && <button type="button" onClick={()=>setForm(empty)} className="rounded-lg border px-4 py-3">New location</button>}
        </div>
      </form>
    </main>
  );
}
