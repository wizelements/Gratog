'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation } from 'lucide-react';
import AddToCalendarButton from './AddToCalendarButton';
import AnalyticsSystem from '@/lib/analytics';
import {
  buildMarketAddressLine,
  getCanonicalMarketDirectionsUrl,
  validateMarketDirectionsConsistency
} from '@/lib/storefront-integrity';

function getNextMarketDate(dayOfWeek, startTime) {
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntilMarket = (dayOfWeek - currentDay + 7) % 7;
  const nextDate = new Date(today);
  
  if (daysUntilMarket === 0) {
    // Check if market is still ongoing today
    const marketTime = new Date(today);
    const [hours, minutes] = startTime.split(':');
    marketTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (today > marketTime) {
      // Market already passed today, get next week
      nextDate.setDate(today.getDate() + 7);
    }
  } else {
    nextDate.setDate(today.getDate() + daysUntilMarket);
  }
  
  return nextDate.toISOString().split('T')[0];
}

function getDayName(dayOfWeek) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

function formatTime(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${hour12}:${minutes} ${period}`;
}

function parseHours(hours = '') {
  const [startTime = '09:00', endTime = '13:00'] = String(hours).split('-');
  return { startTime, endTime };
}

export default function EnhancedMarketCard({ marketName, market, className = '' }) {
  const resolvedName = market?.name || marketName || 'Market Location';
  const address = buildMarketAddressLine(market);
  const schedule = parseHours(market?.hours);
  const canonicalMapsUrl = market?.mapsUrl || getCanonicalMarketDirectionsUrl(market);
  const directionsIntegrity = validateMarketDirectionsConsistency({
    ...(market || {}),
    mapsUrl: canonicalMapsUrl
  });

  const marketData = market
    ? {
      address,
      description: market.description || 'Visit us at this market location for fresh sea moss products.',
      features: ['Fresh Samples', 'Wellness Consultations', 'Passport Rewards'],
      mapsUrl: canonicalMapsUrl,
      specialties: ['Sea Moss Gels', 'Lemonades', 'Wellness Shots'],
      dayOfWeek: typeof market.dayOfWeek === 'number' ? market.dayOfWeek : 6,
      ...schedule,
    }
    : null;

  if (!marketData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Live market data is currently unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  const nextDate = getNextMarketDate(marketData.dayOfWeek, marketData.startTime);
  const dayName = getDayName(marketData.dayOfWeek);
  
  const handleGetDirections = () => {
    AnalyticsSystem.trackMarketDirections(resolvedName);
    if (marketData.mapsUrl) {
      window.open(marketData.mapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return nextDate === today;
  };

  const isTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return nextDate === tomorrow.toISOString().split('T')[0];
  };

  const getDateLabel = () => {
    if (isToday()) return 'Today';
    if (isTomorrow()) return 'Tomorrow';
    
    const date = new Date(nextDate);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{resolvedName}</CardTitle>
            <CardDescription className="mt-1">{marketData.description}</CardDescription>
          </div>
          {isToday() && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Today
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Schedule */}
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
          <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-medium text-emerald-800">
              {dayName}s, {formatTime(marketData.startTime)} - {formatTime(marketData.endTime)}
            </div>
            <div className="text-sm text-emerald-600">
              Next visit: {getDateLabel()}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            {marketData.address || 'Address is being updated. Check the directions link for the latest location details.'}
          </div>
        </div>

        {/* Specialties */}
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Featured Products</h4>
          <div className="flex flex-wrap gap-2">
            {marketData.specialties.map((specialty) => (
              <Badge key={specialty} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Market Features</h4>
          <div className="grid grid-cols-1 gap-1">
            {marketData.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <Button 
            onClick={handleGetDirections}
            disabled={!marketData.mapsUrl}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Get Directions
          </Button>
          
          <AddToCalendarButton
            marketName={resolvedName}
            date={nextDate}
            startTime={marketData.startTime}
            endTime={marketData.endTime}
            address={marketData.address}
            className="w-full"
            variant="outline"
          />
        </div>

        {!directionsIntegrity.isValid && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Directions are generated directly from the displayed address to keep location details consistent while we verify this listing.
          </div>
        )}

        {/* Can't Make It CTA */}
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Can't make it to the market?</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/catalog'}
          >
            Shop Online
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
