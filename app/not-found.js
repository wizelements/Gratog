'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Home, ShoppingCart, Sparkles } from 'lucide-react';

// Featured products to display as recommendations
const FEATURED_PRODUCTS = [
  {
    id: 1,
    name: 'Sea Moss Gel',
    slug: 'sea-moss-gel',
    price: '$25.00',
    emoji: '🌿'
  },
  {
    id: 2,
    name: 'Elderberry Syrup',
    slug: 'elderberry-syrup',
    price: '$18.00',
    emoji: '🫐'
  },
  {
    id: 3,
    name: 'Spicy Bloom Challenge',
    slug: 'spicy-bloom-challenge',
    price: '$29.99',
    emoji: '🌶️'
  }
];

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* 404 Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          {/* Big 404 */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-gray-200 mb-4">404</div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              We couldn't find the page you're looking for. But don't worry, there's plenty of wellness to explore!
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/">
                <Home className="h-5 w-5 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-emerald-600 text-emerald-600">
              <Link href="/catalog">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Shop Now
              </Link>
            </Button>
          </div>

          {/* Search Prompt */}
          <div className="mb-12 p-6 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Search className="h-6 w-6 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Looking for something specific?</h2>
            <p className="text-gray-600 mb-4">Use our search feature to find products, ingredients, or information</p>
            <Button asChild variant="outline" className="border-emerald-600 text-emerald-600">
              <Link href="/catalog">Browse Catalog</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      {mounted && (
        <div className="bg-white py-12 px-4 border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-600" />
              Featured Products
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURED_PRODUCTS.map((product) => (
                <Link key={product.id} href={`/product/${product.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center h-full justify-between">
                      <div>
                        <div className="text-5xl mb-4">{product.emoji}</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600 mb-4">{product.price}</p>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                          View Product
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Helpful Links */}
      <div className="bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-colors">
              <div className="font-semibold mb-1">Home</div>
              <div className="text-sm text-gray-500">Back to start</div>
            </Link>
            <Link href="/catalog" className="text-gray-600 hover:text-emerald-600 transition-colors">
              <div className="font-semibold mb-1">Shop</div>
              <div className="text-sm text-gray-500">All products</div>
            </Link>
            <Link href="/explore" className="text-gray-600 hover:text-emerald-600 transition-colors">
              <div className="font-semibold mb-1">Explore</div>
              <div className="text-sm text-gray-500">Learn & play</div>
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-emerald-600 transition-colors">
              <div className="font-semibold mb-1">Contact</div>
              <div className="text-sm text-gray-500">Get help</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
