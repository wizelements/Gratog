'use client';

import EnhancedHomePage from '@/components/EnhancedHomePage';

export default function HomePage() {
  return <EnhancedHomePage />;
}

/* LEGACY CODE - Keeping for reference
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/ProductCard';
import FitQuiz from '@/components/FitQuiz';
import EnhancedHero from '@/components/EnhancedHero';
import WhatsNewModal from '@/components/WhatsNewModal';
import { getFeaturedProducts } from '@/lib/products';
import { ArrowRight, Leaf, Heart, Award, MapPin, QrCode, Camera, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';

function LegacyHomePage() {
  const featuredProducts = getFeaturedProducts();

  useEffect(() => {
    // Initialize analytics
    AnalyticsSystem.initPostHog();
  }, []);

  const handleCheckout = async (items) => {
    try {
      // Redirect to order page for Square checkout flow
      window.location.href = '/order';
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  const handleQuizRecommendations = (recommendations) => {
    // Handle quiz recommendations
    console.log('Quiz recommendations:', recommendations);
  };

  const handleAddToCart = (product) => {
    // Add product to cart and redirect to order page
    toast.success(`${product.name} added to cart!`);
    setTimeout(() => {
      window.location.href = '/order';
    }, 1000);
  };

  return (
    <div className="flex flex-col">
      {/* What's New Modal */}
      <WhatsNewModal />

      {/* NEW: Square Integration Announcement Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white">
        <div className="container py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="font-semibold">NEW: Secure Square Checkout!</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span className="text-sm">Shop our 19 premium products with fast, secure payments</span>
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="ml-0 sm:ml-4 bg-white text-emerald-600 hover:bg-emerald-50"
            >
              <Link href="/catalog">
                Shop Now <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Hero Section */}
      <EnhancedHero />

      {/* NEW: Square Checkout Benefits */}
      <section className="py-12 bg-gradient-to-br from-white to-emerald-50 border-b">
        <div className="container">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-emerald-600 text-white px-4 py-1">
              <Sparkles className="h-4 w-4 mr-2 inline" />
              Now Powered by Square
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-3">
              Checkout Made Simple & Secure
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience our new Square-powered checkout with 19 premium sea moss products
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-emerald-100">
              <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">Bank-level encryption with Square</p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-emerald-100">
              <div className="mx-auto w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Multiple Options</h3>
              <p className="text-sm text-muted-foreground">Card, Apple Pay & Google Pay</p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-emerald-100">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">Complete orders in seconds</p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-emerald-100">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Order Tracking</h3>
              <p className="text-sm text-muted-foreground">Track every step of your order</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Button
              asChild
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/order">
                <Gift className="mr-2 h-5 w-5" />
                Try New Checkout Experience
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-[#D4AF37]/10 rounded-full">
                  <Leaf className="h-8 w-8 text-[#D4AF37]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">100% Natural</h3>
              <p className="text-muted-foreground">
                Wildcrafted sea moss with organic ingredients, no artificial additives
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-[#D4AF37]/10 rounded-full">
                  <Heart className="h-8 w-8 text-[#D4AF37]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Made with Love</h3>
              <p className="text-muted-foreground">
                Hand-crafted in small batches with care and gratitude
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-[#D4AF37]/10 rounded-full">
                  <Award className="h-8 w-8 text-[#D4AF37]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
              <p className="text-muted-foreground">
                Sourced from the finest wildcrafted sea moss for maximum benefits
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fit Quiz Section */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-emerald-800 mb-4">Find Your Perfect Blend</h2>
            <p className="text-lg text-emerald-600 max-w-2xl mx-auto">
              Take our personalized wellness quiz to discover sea moss products crafted for your unique goals
            </p>
          </div>
          <FitQuiz 
            onRecommendations={handleQuizRecommendations}
            onAddToCart={handleAddToCart}
          />
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onCheckout={handleCheckout}
              />
            ))}
          </div>
          <div className="text-center mt-12">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
            >
              <Link href="/catalog">
                View All Products <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Rewards & Community Section */}
      <section className="py-16 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Market Passport */}
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-emerald-800 mb-4">Market Passport Rewards</h3>
              <p className="text-lg text-emerald-600 mb-6">
                Collect stamps at our markets and unlock exclusive rewards! Start your journey to wellness VIP status.
              </p>
              <div className="flex justify-center lg:justify-start gap-4 mb-6">
                <Badge className="bg-emerald-100 text-emerald-700">2 Stamps = Free Shot</Badge>
                <Badge className="bg-yellow-100 text-yellow-700">5 Stamps = 15% Off</Badge>
                <Badge className="bg-purple-100 text-purple-700">10 Stamps = VIP</Badge>
              </div>
              <Button
                asChild
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Link href="/passport">
                  <QrCode className="mr-2 h-4 w-4" />
                  Get My Passport
                </Link>
              </Button>
            </div>

            {/* UGC Challenge */}
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-orange-800 mb-4">Spicy Bloom Challenge 🌶️</h3>
              <p className="text-lg text-orange-600 mb-6">
                Join our viral challenge! Experience the 10-second flavor bloom and share your reaction for a chance to win.
              </p>
              <div className="flex justify-center lg:justify-start gap-4 mb-6">
                <Badge className="bg-yellow-100 text-yellow-700">$100 Grand Prize</Badge>
                <Badge className="bg-orange-100 text-orange-700">Monthly Raffle</Badge>
                <Badge className="bg-red-100 text-red-700">Community Fame</Badge>
              </div>
              <Button
                asChild
                size="lg"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Link href="/ugc/spicy-bloom">
                  <Camera className="mr-2 h-4 w-4" />
                  Join Challenge
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Markets CTA */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="relative h-[400px] rounded-lg overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1526399743290-f73cb4022f48?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxmYXJtZXJzJTIwbWFya2V0fGVufDB8fHx8MTc1OTg5MzE4NXww&ixlib=rb-4.1.0&q=85"
                  alt="Farmers Market"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-6 w-6 text-[#D4AF37]" />
                <h2 className="text-3xl font-bold">Find Us at Local Markets</h2>
              </div>
              <p className="text-lg text-muted-foreground mb-6">
                Visit us at Atlanta's finest farmers markets! Meet our team, sample our products, and experience the Taste of Gratitude difference in person.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-[#D4AF37] hover:bg-[#B8941F] text-white"
              >
                <Link href="/markets">
                  View Market Schedule <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
