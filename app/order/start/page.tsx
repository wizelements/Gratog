'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QrCode, ShoppingBag, MapPin, Clock, ChevronRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Market configurations
const MARKETS = [
  {
    id: 'serenbe-farmers-market',
    name: 'Serenbe Farmers Market',
    shortName: 'Serenbe',
    address: '10640 Serenbe Trail, Chattahoochee Hills, GA 30268',
    hours: { open: '09:00', close: '13:00' },
    days: ['Saturday'],
    description: 'Handcrafted sea moss gel, juices, and boba every Saturday',
    parkingInfo: 'Free parking at the Farmhouse',
  },
  {
    id: 'dunwoody-farmers-market',
    name: 'Dunwoody Farmers Market',
    shortName: 'DHA',
    address: 'Dunwoody Farmhouse, Dunwoody, GA 30338',
    hours: { open: '08:00', close: '12:00' },
    days: ['Saturday'],
    description: 'Fresh sea moss products and wellness drinks',
    parkingInfo: 'Free parking at the Dunwoody Farmhouse',
  },
  {
    id: 'sandy-springs-market',
    name: 'Sandy Springs Farmers Market',
    shortName: 'Sandy Springs',
    address: '6100 Lake Forrest Dr, Sandy Springs, GA 30328',
    hours: { open: '08:00', close: '12:00' },
    days: ['Saturday'],
    description: 'Saturday morning wellness essentials',
    parkingInfo: 'Free lot parking',
  },
];

export default function QRLandingPage() {
  const searchParams = useSearchParams();
  const marketId = searchParams.get('market');
  const tableId = searchParams.get('table');
  
  const [selectedMarket, setSelectedMarket] = useState(
    MARKETS.find(m => m.id === marketId) || null
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysMarkets = MARKETS.filter(m => m.days.includes(today));
  
  // Determine if selected market is open
  const isMarketOpen = (market: typeof MARKETS[0]) => {
    const now = new Date();
    const [openHour] = market.hours.open.split(':').map(Number);
    const [closeHour] = market.hours.close.split(':').map(Number);
    const currentHour = now.getHours();
    return currentHour >= openHour && currentHour < closeHour;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-6">
        <div className="max-w-md mx-auto text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <QrCode className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1">Taste of Gratitude</h1>
          <p className="text-emerald-100">Handcrafted Sea Moss & Juices</p>
          
          {tableId && (
            <Badge className="mt-3 bg-white/20 text-white border-0">
              Table/Location: {tableId}
            </Badge>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Market Selector (if no market specified) */}
        {!marketId && todaysMarkets.length > 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Select Today's Market:</h2>
            {todaysMarkets.map(market => (
              <button
                key={market.id}
                onClick={() => setSelectedMarket(market)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-colors",
                  selectedMarket?.id === market.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-muted bg-card hover:border-emerald-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    isMarketOpen(market) ? "bg-emerald-500" : "bg-slate-300"
                  )}></div>
                  <div>
                    <div className="font-semibold">{market.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {market.hours.open} - {market.hours.close}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Market Info */}
        {selectedMarket && (
          <Card className={cn(
            "p-4 border-l-4",
            isMarketOpen(selectedMarket) ? "border-l-emerald-500 bg-emerald-50" : "border-l-slate-400 bg-slate-50"
          )}>
            <div className="flex items-start gap-3">
              <Store className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">{selectedMarket.name}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{selectedMarket.hours.open} - {selectedMarket.hours.close}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{selectedMarket.description}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {selectedMarket ? (
          <div className="space-y-3">
            {isMarketOpen(selectedMarket) ? (
              <>
                <Link href={`/order/menu?market=${selectedMarket.id}${tableId ? `&table=${tableId}` : ''}`}>
                  <Button size="lg" className="w-full h-14 text-lg">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Start Order
                    <ChevronRight className="w-5 h-5 ml-auto" />
                  </Button>
                </Link>
                
                <Link href={`/preorder?market=${selectedMarket.id}`}>
                  <Button size="lg" variant="secondary" className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-600 text-white">
                    <Clock className="w-5 h-5 mr-2" />
                    Preorder for Pickup
                    <Badge className="ml-2 bg-white/20 text-white border-0 text-xs">Skip the Line</Badge>
                  </Button>
                </Link>
                
                <Link href={`/menu?market=${selectedMarket.id}`}>
                  <Button variant="outline" size="lg" className="w-full">
                    View Menu
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center py-6">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">This market is currently closed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Online ordering available {selectedMarket.hours.open} - {selectedMarket.hours.close}
                </p>
              </div>
            )}
          </div>
        ) : !marketId && todaysMarkets.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No markets scheduled today.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              We vend Saturday (Serenbe, Sandy Springs) and Sunday (DHA).
            </p>
          </div>
        ) : null}

        {/* Quick Links */}
        <div className="border-t pt-6 space-y-2">
          {selectedMarket && (
            <a 
              href={`https://maps.google.com/?q=${encodeURIComponent(selectedMarket.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground"
            >
              <span>Get Directions to {selectedMarket.shortName}</span>
              <MapPin className="w-4 h-4" />
            </a>
          )}
          
          <Link href="/" className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground">
            <span>Visit Full Website</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
