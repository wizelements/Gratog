'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

const STATES = ['new', 'contacted', 'quoted', 'booked', 'closed'];
const validDate = (value) => {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not specified' : date.toLocaleDateString('en-US');
};

export default function EventInquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filter) params.set('status', filter);
      const response = await adminFetch('/api/admin/event-inquiries?' + params);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not load inquiries');
      setInquiries(data.inquiries || []);
      setPages(data.pagination?.pages || 0);
    } catch (err) {
      setError(err.message || 'Could not load event inquiries.');
      setInquiries([]);
    } finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    setSaving(id);
    setError('');
    try {
      const response = await adminFetch('/api/admin/event-inquiries', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Status update failed');
      await load();
    } catch (err) {
      setError(err.message || 'Status update failed');
    } finally { setSaving(''); }
  }

  return (
    <main className="space-y-6 p-2 sm:p-4">
      <header>
        <h1 className="text-3xl font-semibold text-stone-950">Event inquiries</h1>
        <p className="mt-2 text-sm text-stone-600">Review incoming booking opportunities, follow up personally, and track each inquiry toward a confirmed booking. No messages are sent automatically by this page.</p>
      </header>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <label htmlFor="event-inquiry-filter" className="block text-sm font-semibold">Show inquiries</label>
          <select id="event-inquiry-filter" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="rounded-lg border border-stone-300 bg-white p-2 text-sm">
            <option value="">All statuses</option>
            {STATES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
        </div>
        <button type="button" onClick={load} className="rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900">Refresh</button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {loading ? <p role="status">Loading event inquiries…</p> : inquiries.length === 0 ? (
        <p className="rounded-xl border bg-white p-6">No event inquiries match this filter.</p>
      ) : (
        <div className="grid gap-4">
          {inquiries.map((item) => (
            <article key={item.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-stone-950">{item.name || 'Event organizer'}</h2>
                  <p className="text-xs text-stone-600">Received {validDate(item.createdAt)} · {item.source || 'website'}</p>
                </div>
                <div>
                  <label htmlFor={'inquiry-'+item.id} className="block text-xs font-semibold text-stone-600">Pipeline status</label>
                  <select id={'inquiry-'+item.id} value={STATES.includes(item.status) ? item.status : 'new'} onChange={(e) => updateStatus(item.id, e.target.value)} disabled={saving === item.id} className="mt-1 rounded-lg border border-stone-300 bg-white p-2 text-sm">
                    {STATES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold">Event</dt><dd>{item.metadata?.eventType || 'See notes'}</dd></div>
                <div><dt className="font-semibold">Date</dt><dd>{item.metadata?.eventDate || 'See notes'}</dd></div>
                <div><dt className="font-semibold">Location</dt><dd>{item.metadata?.eventLocation || 'See notes'}</dd></div>
                <div><dt className="font-semibold">Guests</dt><dd>{item.metadata?.guestCount || 'Not specified'}</dd></div>
                <div><dt className="font-semibold">Email</dt><dd className="break-all">{item.email || 'Not provided'}</dd></div>
                <div><dt className="font-semibold">Phone</dt><dd>{item.phone || 'Not provided'}</dd></div>
              </dl>
              {item.message && <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-stone-50 p-3 text-sm text-stone-800">{item.message}</p>}
            </article>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm disabled:opacity-50">Previous</button>
        <p className="text-sm text-stone-600">Page {page} of {Math.max(1, pages)}</p>
        <button type="button" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm disabled:opacity-50">Next</button>
      </div>
    </main>
  );
}
