'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/ProductCard';
import FitQuiz from '@/components/FitQuiz';
import EnhancedHero from '@/components/EnhancedHero';
import { getFeaturedProducts } from '@/lib/products';
import { ArrowRight, Leaf, Heart, Award, MapPin, QrCode, Camera, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';

export default function HomePage() {
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
      {/* Enhanced Hero Section */}
      <EnhancedHero />

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
