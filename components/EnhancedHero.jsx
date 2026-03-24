'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Heart, Leaf } from 'lucide-react';
import AnalyticsSystem from '@/lib/analytics';

const ROTATING_HEADLINES = [
  "Wildcrafted Sea Moss Wellness",
  "Small Batch, Big Heart",
  "Crafted with Gratitude",
  "Your Wellness Journey Starts Here",
  "🧋 Boba at the Market"
];

const BADGES = [
  { text: "100% Natural", icon: Leaf },
  { text: "Wildcrafted", icon: Sparkles },
  { text: "Small Batch", icon: Heart },
  { text: "ATL Markets", icon: null }
];

export default function EnhancedHero() {
  const [currentHeadline, setCurrentHeadline] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Initialize analytics
    AnalyticsSystem.initPostHog();
    
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentHeadline((prev) => (prev + 1) % ROTATING_HEADLINES.length);
        setIsVisible(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleCTAClick = (cta) => {
    AnalyticsSystem.trackHeroCTA(cta);
    
    if (cta === 'shop') {
      window.location.href = '/catalog';
    } else if (cta === 'story') {
      window.location.href = '/about';
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-teal-200 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-emerald-300 rounded-full blur-lg"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <Badge 
                key={badge.text}
                variant="outline" 
                className="px-4 py-2 bg-white/80 border-emerald-200 text-emerald-700 font-medium"
              >
                {Icon && <Icon className="w-4 h-4 mr-2" />}
                {badge.text}
              </Badge>
            );
          })}
        </div>

        {/* Dynamic Headline */}
        <div className="mb-6 h-20 flex items-center justify-center">
          <h1 
            className={`text-4xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-300 ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            {ROTATING_HEADLINES[currentHeadline]}
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
          Discover premium sea moss products crafted in small batches with wildcrafted ingredients. 
          <span className="text-emerald-600 font-medium"> Nourish your body, elevate your wellness journey.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            onClick={() => handleCTAClick('shop')}
            size="lg"
            data-testid="hero-shop-now-btn"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            Shop Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <Button 
            onClick={() => handleCTAClick('story')}
            variant="outline"
            size="lg"
            data-testid="hero-our-story-btn"
            className="border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-8 py-4 text-lg font-medium transition-all duration-200 hover:scale-105"
          >
            Our Story
          </Button>
        </div>

        {/* Social Proof */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-2">500+</div>
            <div className="text-gray-600">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-2">3</div>
            <div className="text-gray-600">Market Locations</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-2">100%</div>
            <div className="text-gray-600">Natural Ingredients</div>
          </div>
        </div>

        {/* Market Teaser */}
        <div className="mt-16 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Next Market Visit</span>
          </div>
          <div className="text-lg font-semibold text-gray-800 mb-2">
            Serenbe Farmers Market - This Saturday
          </div>
          <div className="text-gray-600 mb-4">
            9:00 AM - 1:00 PM • Samples & Consultations Available
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/markets'}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            View All Markets
          </Button>
        </div>

        {/* Boba Market Exclusive Teaser */}
        <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50 backdrop-blur-sm rounded-2xl border border-purple-200 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🧋</span>
            <span className="text-purple-700 font-bold text-lg">Market Exclusive</span>
          </div>
          <div className="text-xl font-bold text-gray-800 mb-2">
            Handcrafted Boba & Cream — Only at Serenbe
          </div>
          <div className="text-gray-600 mb-1">
            Taro Boba • Strawberry Matcha • Brown Sugar • Vanilla Bean & more
          </div>
          <div className="text-sm text-purple-600 font-medium mb-4">
            Made fresh at the market. Kids, Medium & Large sizes available.
          </div>
          <Button 
            onClick={() => window.location.href = '/catalog?category=boba+and+cream'}
            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white"
          >
            🎪 Preview the Boba Menu
          </Button>
        </div>
      </div>
    </section>
  );
}