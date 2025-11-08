'use client';

import { useState } from 'react';
import FitQuiz from '@/components/FitQuiz';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function QuizPage() {
  const [showQuiz, setShowQuiz] = useState(true);
  const [recommendations, setRecommendations] = useState([]);

  const handleQuizRecommendations = (recs) => {
    setRecommendations(recs);
    toast.success(`Found ${recs.length} perfect matches for you!`);
  };

  const handleAddToCart = (product) => {
    // Redirect to order page with product
    window.location.href = `/order?add=${product.id}`;
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

        {showQuiz && (
          <FitQuiz
            onRecommendations={handleQuizRecommendations}
            onAddToCart={handleAddToCart}
          />
        )}

        {!showQuiz && recommendations.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Your Personalized Recommendations</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {recommendations.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-emerald-600">${product.price}</span>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Button
                variant="outline"
                onClick={() => setShowQuiz(true)}
                className="mr-4"
              >
                Retake Quiz
              </Button>
              <Link href="/catalog">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Browse All Products
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
