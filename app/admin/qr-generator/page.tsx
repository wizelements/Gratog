'use client';

import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Printer } from 'lucide-react';
import { getActiveMarketPickups } from '@/data/markets';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const markets = getActiveMarketPickups();

/** Stable per-market QR target: weekly changes never require reprinting. */
export default function QRGeneratorPage() {
  const [marketId, setMarketId] = useState(markets[0]?.id || '');
  const selected = markets.find(market => market.id === marketId);
  const targetPath = selected ? `/m/${encodeURIComponent(selected.id)}` : '';
  const canonicalUrl = useMemo(() => `https://tasteofgratitude.shop${targetPath}`, [targetPath]);
  const imageUrl = selected
    ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=18&data=${encodeURIComponent(canonicalUrl)}`
    : '';

  const copy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      toast.success('Market menu link copied');
    } catch {
      toast.error('Clipboard unavailable. Select the URL below to copy it.');
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Market QR Codes</h1>
        <p className="mt-2 text-sm text-stone-600">
          Each code always points to that market's dedicated menu. It does not lead to an unverified checkout.
          Customers can read the menu without signing in.
        </p>
      </div>
      <Card className="space-y-5 p-6">
        <div>
          <label htmlFor="qr-market" className="mb-2 block text-sm font-semibold">Choose market</label>
          <select id="qr-market" value={marketId} onChange={event => setMarketId(event.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base">
            {markets.map(market => <option key={market.id} value={market.id}>{market.name}</option>)}
          </select>
        </div>
        {selected && (
          <>
            <div className="rounded-xl border border-stone-200 bg-white p-5 text-center">
              <h2 className="text-xl font-bold">Taste of Gratitude</h2>
              <p className="mt-1 text-sm">{selected.name} · Scan for today's menu</p>
              <img src={imageUrl} alt={`QR code linking to ${selected.name} menu`}
                width="360" height="360" className="mx-auto mt-4 max-w-full" />
              <p className="mt-2 break-all text-xs text-stone-700">{canonicalUrl}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={copy}><Copy className="mr-2 h-4 w-4" />Copy menu URL</Button>
              <Button variant="outline" onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="mr-2 h-4 w-4" />Open QR image
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />Print
              </Button>
            </div>
            <p className="text-xs leading-5 text-stone-600">
              QR image is generated from the public menu URL by an external QR image service.
              After printing, scan the code on a phone and confirm the destination is {canonicalUrl}.
              Keep the sign visible at the booth.
            </p>
          </>
        )}
        {!selected && <p className="text-sm">No active market has been published.</p>}
      </Card>
    </main>
  );
}
