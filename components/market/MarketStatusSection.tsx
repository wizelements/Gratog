'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Navigation, X, ChevronRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatTimeRemaining } from '@/lib/date-utils';

interface Market {
  id: string;
  name: string;
  shortName: string;
  address: string;
  hours: { open: string; close: string };
  isOpen: boolean;
  isUpcoming: boolean;
  minutesUntilOpen: number;
  minutesUntilClose: number;
  description: string;
}

interface MarketData {
  hasMarketsToday: boolean;
  hasOpenMarket: boolean;
  primaryMarket: Market | null;
  markets: Market[];
}

export function MarketStatusSection() {
  const [data, setData] = useState<MarketData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/market/today', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible || isLoading || !data?.hasMarketsToday) return null;

  const { primaryMarket, markets, hasOpenMarket } = data;
  if (!primaryMarket) return null;

  return (
    <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Status */}
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              hasOpenMarket ? "bg-white/20" : "bg-white/10"
            )}>
              {hasOpenMarket ? (
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                </span>
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-bold">
                {hasOpenMarket 
                  ? `We're at ${primaryMarket.name}!`
                  : `Opening soon at ${primaryMarket.name}`
                }
              </h2>
              <div className="flex items-center gap-2 text-emerald-100 mt-1">
                <Clock className="w-4 h-4" />
                <span>
                  {hasOpenMarket 
                    ? `Open until ${primaryMarket.hours.close} (${formatTimeRemaining(primaryMarket.minutesUntilClose)} left)`
                    : `Opens at ${primaryMarket.hours.open} (${formatTimeRemaining(primaryMarket.minutesUntilOpen)} from now)`
                  }
                </span>
              </div>
              
              {markets.length > 1 && (
                <p className="text-sm text-emerald-200 mt-1">
                  +{markets.length - 1} more {markets.length - 1 === 1 ? 'market' : 'markets'} today
                </p>
              )}
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex flex-wrap gap-3">
            {hasOpenMarket && (
              <Link href={`/order/start?market=${primaryMarket.id}`}>
                <Button 
                  size="lg" 
                  className="bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  Order at Market
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
            
            <a 
              href={`https://maps.google.com/?q=${encodeURIComponent(primaryMarket.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
              >
                <Navigation className="w-4 h-4 mr-1" />
                Directions
              </Button>
            </a>
            
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Market Selector (if multiple open) */}
        {markets.length > 1 && hasOpenMarket && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-sm text-emerald-100 mb-3">All markets open today:</p>
            <div className="flex flex-wrap gap-2">
              {markets.filter(m => m.isOpen).map(market => (
                <Link 
                  key={market.id}
                  href={`/order/start?market=${market.id}`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "border-white/30",
                      market.id === primaryMarket.id 
                        ? "bg-white/20 text-white" 
                        : "text-emerald-100 hover:bg-white/10"
                    )}
                  >
                    <Store className="w-3 h-3 mr-1" />
                    {market.shortName}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
