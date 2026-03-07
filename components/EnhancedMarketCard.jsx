'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, Phone } from 'lucide-react';
import AddToCalendarButton from './AddToCalendarButton';
import AnalyticsSystem from '@/lib/analytics';

const MARKET_DATA = {
  'Serenbe': {
    address: 'Serenbe Farmers Market, 10950 Hutcheson Ferry Rd, Palmetto, GA 30268',
    description: 'Nestled in the heart of Serenbe, our market booth offers the full Taste of Gratitude experience.',
    features: ['Full Product Line', 'Samples Available', 'Wellness Consultations'],
    phone: '(470) 555-MOSS',
    mapsUrl: 'https://maps.google.com?q=Serenbe+Farmers+Market,+Palmetto,+GA',
    image: '/images/markets/serenbe-market.jpg',
    specialties: ['Holy Grail Gel', 'Elderberry Moss', 'Fresh Lemonades'],
    dayOfWeek: 6, // Saturday
    startTime: '09:00',
    endTime: '13:00'
  },
  'East Atlanta Village': {
    address: 'East Atlanta Village Market, East Atlanta, GA',
    description: 'Join us in the vibrant EAV community for locally-crafted sea moss wellness.',
    features: ['Community Hub', 'Live Demos', 'Seasonal Specials'],
    phone: '(470) 555-MOSS',
    mapsUrl: 'https://maps.google.com?q=East+Atlanta+Village+Market',
    image: '/images/markets/eav-market.jpg',
    specialties: ['Spicy Bloom Shots', 'Blue Lotus Gel', 'Grateful Greens'],
    dayOfWeek: 0, // Sunday
    startTime: '11:00',
    endTime: '16:00'
  },
  'Ponce City Market': {
    address: 'Ponce City Market, 675 Ponce De Leon Ave NE, Atlanta, GA 30308',
    description: 'Experience Taste of Gratitude in Atlanta\'s premier food hall destination.',
    features: ['Premium Location', 'Tourist Friendly', 'Gift Packaging'],
    phone: '(470) 555-MOSS',
    mapsUrl: 'https://maps.google.com?q=Ponce+City+Market+Atlanta',
    image: '/images/markets/ponce-market.jpg',
    specialties: ['Starter Trio Bundle', 'Floral Tide', 'Market Exclusive Flavors'],
    dayOfWeek: 6, // Saturday
    startTime: '10:00',
    endTime: '18:00'
  }
};

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
  const resolvedName = market?.name || marketName;

  const marketData = market
    ? {
      address: [market.address, market.city, market.state, market.zip].filter(Boolean).join(', '),
      description: market.description || 'Visit us at this market location for fresh sea moss products.',
      features: ['Fresh Samples', 'Wellness Consultations', 'Passport Rewards'],
      phone: '(470) 555-MOSS',
      mapsUrl: market.mapsUrl || `https://maps.google.com?q=${encodeURIComponent(market.name)}`,
      image: '/images/markets/serenbe-market.jpg',
      specialties: ['Sea Moss Gels', 'Lemonades', 'Wellness Shots'],
      dayOfWeek: typeof market.dayOfWeek === 'number' ? market.dayOfWeek : 6,
      ...parseHours(market.hours)
    }
    : MARKET_DATA[marketName];

  if (!marketData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Market information not available</p>
        </CardContent>
      </Card>
    );
  }

  const nextDate = getNextMarketDate(marketData.dayOfWeek, marketData.startTime);
  const dayName = getDayName(marketData.dayOfWeek);
  
  const handleGetDirections = () => {
    AnalyticsSystem.trackMarketDirections(resolvedName);
    window.open(marketData.mapsUrl, '_blank');
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
            {marketData.address}
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

        {/* Contact */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-100">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{marketData.phone}</span>
        </div>

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
