'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, MapPin, Package, ArrowRight } from 'lucide-react';

interface FreshBatchRequest {
  id: string;
  email: string;
  phone?: string | null;
  requestedProductName?: string | null;
  requestedProductSlug?: string | null;
  flavorProfile?: string | null;
  requestedFlavorText?: string | null;
  quantity: number;
  quantityUnit: string;
  gallonEquivalent: number;
  preferredMarketId: string;
  needByDate?: string | null;
  notes?: string | null;
  status: string;
  requestSource: string;
  createdAt: string;
}

const MARKET_NAMES: Record<string, string> = {
  serenbe: 'Serenbe',
  dunwoody: 'Dunwoody',
};

const UNIT_LABELS: Record<string, string> = {
  bottle_16oz: 'bottle',
  multi_bottle: 'bottles',
  half_gallon: 'half gal',
  gallon: 'gal',
  two_gallons: 'gal',
  three_plus_gallons: 'gal',
  sample_interest: 'samples',
};

export default function FreshBatchesAdminPage() {
  const [requests, setRequests] = useState<FreshBatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/fresh-batch/requests?limit=200', { skipCsrf: true });
      if (res.success) {
        setRequests(res.data.requests || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, FreshBatchRequest[]>();
    requests.forEach((r) => {
      const key = r.requestedProductSlug || r.flavorProfile || r.requestedFlavorText || 'custom';
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [requests]);

  const totalGallons = useMemo(
    () => requests.reduce((sum, r) => sum + (r.gallonEquivalent || 0), 0),
    [requests]
  );

  const filtered = useMemo(() => {
    if (!filter) return requests;
    const f = filter.toLowerCase();
    return requests.filter(
      (r) =>
        r.email.toLowerCase().includes(f) ||
        (r.requestedProductName || '').toLowerCase().includes(f) ||
        (r.flavorProfile || '').toLowerCase().includes(f) ||
        (r.requestedFlavorText || '').toLowerCase().includes(f)
    );
  }, [requests, filter]);

  const formatQuantity = (r: FreshBatchRequest) => {
    const unit = UNIT_LABELS[r.quantityUnit] || r.quantityUnit;
    if (r.quantityUnit === 'multi_bottle' || r.quantityUnit === 'three_plus_gallons') {
      return `${r.quantity} ${unit}`;
    }
    return unit === 'bottle' || unit === 'gal' ? `${r.quantity} ${unit}` : unit;
  };

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Fresh Batch Requests</h1>
            <p className="text-sm text-stone-600">
              {requests.length} requests · {totalGallons.toFixed(2)} gal total demand
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/fresh-batches/planner">
                Batch planner <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter by email, flavor, or profile"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm sm:max-w-sm"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demand by flavor / profile</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-auto">
              {grouped.length === 0 ? (
                <p className="text-sm text-stone-500">No requests yet.</p>
              ) : (
                <ul className="space-y-2">
                  {grouped.map(([key, items]) => {
                    const gallons = items.reduce((s, r) => s + (r.gallonEquivalent || 0), 0);
                    return (
                      <li key={key} className="flex items-center justify-between rounded-lg border border-stone-100 bg-white p-3">
                        <span className="text-sm font-medium capitalize text-stone-800">{key.replace(/-/g, ' ')}</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-stone-900">{items.length} requests</p>
                          <p className="text-xs text-stone-500">{gallons.toFixed(2)} gal</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Newest requests</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-stone-500">No matching requests.</p>
              ) : (
                <ul className="space-y-3">
                  {filtered.slice(0, 50).map((r) => (
                    <li key={r.id} className="rounded-lg border border-stone-100 bg-white p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {r.requestedProductName || r.flavorProfile || r.requestedFlavorText || 'Custom flavor'}
                          </p>
                          <p className="text-xs text-stone-500">
                            {formatQuantity(r)} · {MARKET_NAMES[r.preferredMarketId] || r.preferredMarketId}
                          </p>
                          <p className="mt-1 text-xs text-stone-600">{r.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {r.notes && <p className="mt-2 text-xs text-stone-600 italic">“{r.notes}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
