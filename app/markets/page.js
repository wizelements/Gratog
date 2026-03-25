'use client';

import { useCallback, useEffect, useState } from 'react';
import EnhancedMarketCard from '@/components/EnhancedMarketCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Heart, QrCode } from 'lucide-react';
import AnalyticsSystem from '@/lib/analytics';

export default function MarketsPage() {
  const [markets, setMarkets] = useState([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [marketsError, setMarketsError] = useState('');

  const fetchMarkets = useCallback(async () => {
    setIsLoadingMarkets(true);

    try {
      const response = await fetch('/api/markets', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Market API returned ${response.status}`);
      }

      const data = await response.json();

      if (data?.success && Array.isArray(data.markets)) {
        setMarkets(data.markets);
        setMarketsError('');
        return;
      }

      throw new Error('Invalid market payload');
    } catch (error) {
      console.error('Failed to load markets:', error);
      setMarkets([]);
      setMarketsError('Market locations are temporarily unavailable. Please check back shortly.');
    } finally {
      setIsLoadingMarkets(false);
    }
  }, []);

  useEffect(() => {
    // Initialize analytics
    AnalyticsSystem.initPostHog();

    fetchMarkets();
  }, [fetchMarkets]);

  const hasMarkets = markets.length > 0;

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
          {isLoadingMarkets && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading market locations...
              </CardContent>
            </Card>
          )}

          {!isLoadingMarkets && marketsError && (
            <Card className="md:col-span-2 lg:col-span-3 border-amber-300 bg-amber-50">
              <CardContent className="p-6 text-center text-amber-900 space-y-4">
                <p>{marketsError}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-400 text-amber-900 hover:bg-amber-100"
                  onClick={fetchMarkets}
                >
                  Retry Markets Feed
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoadingMarkets && !marketsError && !hasMarkets && (
            <Card className="md:col-span-2 lg:col-span-3 border-slate-200 bg-white/80">
              <CardContent className="p-6 text-center text-slate-700">
                No active market listings are published right now. Please check back soon for updated schedule details.
              </CardContent>
            </Card>
          )}

          {!isLoadingMarkets && !marketsError && markets.map((market) => (
            <EnhancedMarketCard
              key={market.id || market.name}
              market={market}
              marketName={market.name}
            />
          ))}
        </div>

        {/* Market-Exclusive Boba Section */}
        <Card className="mb-12 bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50 border-purple-200 overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-full flex items-center justify-center">
                <span className="text-3xl">🧋</span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Market-Exclusive Boba
                </h2>
                <p className="text-gray-600 mb-1">
                  Taro Boba • Strawberry Matcha • Brown Sugar • Vanilla Bean & more
                </p>
                <p className="text-sm text-purple-600 font-medium">
                  Made fresh every Saturday at Serenbe Farmers Market. Kids, Medium & Large sizes available.
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = '/markets'}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white flex-shrink-0"
              >
                🎪 Find Us at Serenbe
              </Button>
            </div>
          </CardContent>
        </Card>

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
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">🧋 Fresh Boba</div>
                    <div className="text-gray-600">Handcrafted boba drinks made fresh at the market</div>
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
