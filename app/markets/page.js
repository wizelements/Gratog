'use client';

import { useEffect, useState } from 'react';
import EnhancedMarketCard from '@/components/EnhancedMarketCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Heart, QrCode } from 'lucide-react';
import AnalyticsSystem from '@/lib/analytics';

const MARKETS = [
  'Serenbe',
  'East Atlanta Village',
  'Ponce City Market'
];

export default function MarketsPage() {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    // Initialize analytics
    AnalyticsSystem.initPostHog();

    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/markets', { cache: 'no-store' });
        const data = await response.json();

        if (data?.success && Array.isArray(data.markets)) {
          setMarkets(data.markets);
        }
      } catch (error) {
        // Keep static fallback market cards if API is unavailable.
        console.error('Failed to load markets:', error);
      }
    };

    fetchMarkets();
  }, []);

  const marketCards = markets.length > 0
    ? markets
    : MARKETS.map((name) => ({ id: name, name }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <MapPin className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">
            Find Us at Local Markets
          </h1>
          <p className="text-xl text-emerald-600 max-w-2xl mx-auto mb-8">
            Experience Taste of Gratitude in person! Visit our booths at Atlanta's 
            finest farmers markets for samples, consultations, and the full product line.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <Heart className="w-4 h-4" />
              <span>Fresh Samples Available</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <Clock className="w-4 h-4" />
              <span>Wellness Consultations</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <QrCode className="w-4 h-4" />
              <span>Passport Rewards</span>
            </div>
          </div>
        </div>

        {/* Market Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {marketCards.map((market) => (
            <EnhancedMarketCard
              key={market.id || market.name}
              market={market}
              marketName={market.name}
            />
          ))}
        </div>

        {/* Market Passport CTA */}
        <Card className="bg-gradient-to-r from-emerald-100 to-teal-100 border-emerald-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <QrCode className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-emerald-800">
              Get Your Market Passport
            </CardTitle>
            <CardDescription className="text-lg text-emerald-700">
              Collect stamps at markets, earn XP points, and unlock exclusive rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl mb-2">🎆</div>
                <div className="font-medium text-emerald-800">2 Stamps</div>
                <div className="text-sm text-emerald-600">Free 2oz Shot</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🌟</div>
                <div className="font-medium text-emerald-800">5 Stamps</div>
                <div className="text-sm text-emerald-600">15% Off Coupon</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🏆</div>
                <div className="font-medium text-emerald-800">10 Stamps</div>
                <div className="text-sm text-emerald-600">VIP Status</div>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/passport'}
              className="bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Get My Passport
            </Button>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-800">What to Expect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Product Sampling</div>
                    <div className="text-gray-600">Try before you buy with generous samples</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Wellness Guidance</div>
                    <div className="text-gray-600">Get personalized product recommendations</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Community Connection</div>
                    <div className="text-gray-600">Meet other wellness enthusiasts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Fresh Products</div>
                    <div className="text-gray-600">Weekly small-batch, wildcrafted goods</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-800">Can't Make It?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Shop our complete product line online with convenient pickup or delivery options.
              </p>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/catalog'}
                >
                  🛍️ Browse Full Catalog
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/order'}
                >
                  📦 Order for Delivery
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/ugc/spicy-bloom'}
                >
                  🌶️ Join Spicy Bloom Challenge
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
