'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Navigation, X, ChevronRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  parkingInfo: string;
}

interface MarketData {
  date: string;
  dayName: string;
  markets: Market[];
  primaryMarket: Market | null;
  hasMarketsToday: boolean;
  hasOpenMarket: boolean;
}

interface LiveLocationBannerProps {
  className?: string;
}

export function LiveLocationBanner({ className }: LiveLocationBannerProps) {
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

  if (!isVisible || isLoading) return null;

  // No markets today
  if (!data?.hasMarketsToday) {
    return (
      <div className={cn(
        "bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3",
        className
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            <span className="font-medium">No markets today. Check back Saturday or Sunday!</span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Multiple markets today - show primary
  const market = data.primaryMarket;
  if (!market) return null;

  // Market is open
  if (market.isOpen) {
    const timeLeft = formatTimeRemaining(market.minutesUntilClose);
    
    return (
      <div className={cn(
        "bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3",
        className
      )}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <MapPin className="w-5 h-5" />
              <span className="font-semibold">We're at {market.name}!</span>
            </div>            
            <div className="flex items-center gap-1 text-emerald-50 text-sm">
              <Clock className="w-4 h-4" />
              <span>Open until {market.hours.close} ({timeLeft} left)</span>
            </div>
            
            {data.markets.length > 1 && (
              <Badge className="bg-white/20 text-white border-0">
                +{data.markets.length - 1} more {data.markets.length - 1 === 1 ? 'market' : 'markets'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(market.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </a>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Market is coming up
  if (market.isUpcoming) {
    const timeUntil = formatTimeRemaining(market.minutesUntilOpen);
    
    return (
      <div className={cn(
        "bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3",
        className
      )}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Opening soon at {market.name}</span>
            </div>            
            <div className="flex items-center gap-2 text-blue-50 text-sm">
              <span>Opens at {market.hours.open} ({timeUntil} from now)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Market is closed for the day
  return (
    <div className={cn(
      "bg-gradient-to-r from-slate-500 to-slate-600 text-white px-4 py-3",
      className
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span className="font-medium">{market.name} is now closed for the day</span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
