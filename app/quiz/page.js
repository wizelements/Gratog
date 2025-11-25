'use client';

import { useState } from 'react';
import FitQuiz from '@/components/FitQuiz';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function QuizPage() {
  // Don't handle recommendations externally - let FitQuiz show its own results
  const handleAddToCart = (product) => {
    // Use cart engine
    const { addToCart } = require('@/lib/cart-engine');
    try {
      addToCart(product, 1);
      toast.success(`Added ${product.name} to cart!`);
      // Dispatch cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error(`Failed to add ${product.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Quiz Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">
            Your Wellness Journey Starts Here
          </h1>
          <p className="text-lg text-emerald-600 max-w-2xl mx-auto">
            Answer a few quick questions to discover sea moss products perfectly matched to your health goals
          </p>
        </div>

        {/* Let FitQuiz handle its own display, just provide cart callback */}
        <FitQuiz onAddToCart={handleAddToCart} />
      </div>
    </div>
  );
}
