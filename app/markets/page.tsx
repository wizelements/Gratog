'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Clock, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Market {
  id: string;
  name: string;
  address: string;
  day: string;
  hours: string;
  emoji: string;
  coordinates: { lat: number; lng: number };
}

const MARKETS: Market[] = [
  {
    id: "serenbe",
    name: "Serenbe Farmers Market",
    address: "10640 Serenbe Trail, Chattahoochee Hills, GA 30268",
    day: "Saturday",
    hours: "9:00 AM - 1:00 PM",
    emoji: "🏡",
    coordinates: { lat: 33.5408, lng: -84.7245 },
  },
  {
    id: "dunwoody",
    name: "Dunwoody Farmers Market",
    address: "Dunwoody Farmhouse, Dunwoody, GA 30338",
    day: "Saturday",
    hours: "9:00 AM - 12:00 PM",
    emoji: "🏪",
    coordinates: { lat: 33.9462, lng: -84.3346 },
  },
  {
    id: "sandy-springs",
    name: "Sandy Springs Farmers Market",
    address: "Sandy Springs City Center, Sandy Springs, GA 30328",
    day: "Sunday",
    hours: "10:00 AM - 1:00 PM",
    emoji: "🌳",
    coordinates: { lat: 33.9304, lng: -84.3733 },
  },
];

// Get next market date
function getNextMarketDate(dayName: string): Date {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = days.indexOf(dayName);
  const today = new Date();
  const todayDay = today.getDay();
  
  let daysUntil = targetDay - todayDay;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntil);
  return nextDate;
}

// Calculate time until market
function getCountdown(targetDate: Date, hours: string): string {
  const now = new Date();
  const [startHour] = hours.split(':');
  const marketStart = new Date(targetDate);
  marketStart.setHours(parseInt(startHour), 0, 0, 0);
  
  const diff = marketStart.getTime() - now.getTime();
  
  if (diff <= 0) return "Market is open now!";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hoursLeft}h ${minutes}m`;
  if (hoursLeft > 0) return `${hoursLeft}h ${minutes}m`;
  return `${minutes}m`;
}

interface MarketCardProps {
  market: Market;
}

function MarketCard({ market }: MarketCardProps) {
  const [countdown, setCountdown] = useState('');
  const nextDate = getNextMarketDate(market.day);
  
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getCountdown(nextDate, market.hours));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [nextDate, market.hours]);
  
  const formattedDate = nextDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/preorder?market=${market.id}`}
      className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">{market.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
              {market.name}
            </h3>
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              Next: {formattedDate}
            </Badge>
          </div>
          
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{market.day}s {market.hours}</span>
          </div>
          
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{market.address}</span>
          </div>
          
          {/* Countdown Timer */}
          <div className="mt-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-600">
              {countdown || 'Calculating...'}
            </span>
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
      </div>
    </Link>
  );
}

export default function MarketsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Preorder Available</span>
          </div>
          <h1 className="text-3xl font-bold">Our Markets</h1>
          <p className="mt-2 text-emerald-100">
            Find us at farmers markets across Atlanta. Preorder to skip the line!
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Preorder Benefits:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Skip the line with a waitlist number</li>
                <li>Guaranteed availability</li>
                <li>Pay at pickup (cash or card)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Markets List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-gray-900">Select a Market:</h2>
          
          <div className="grid gap-4">
            {MARKETS.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">What to Expect</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🛍️</div>
              <div className="font-medium text-gray-900">Shop in Person</div>
              <div className="text-sm text-gray-500">Try samples & get advice</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🎫</div>
              <div className="font-medium text-gray-900">Waitlist Number</div>
              <div className="text-sm text-gray-500">Know your place in line</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">📱</div>
              <div className="font-medium text-gray-900">Text Updates</div>
              <div className="text-sm text-gray-500">Get notified when ready</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
