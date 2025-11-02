'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Share2, RefreshCw, ShoppingCart, Sparkles } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function QuizResultsPage() {
  const params = useParams();
  const quizId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (quizId) {
      fetchQuizResults();
    }
  }, [quizId]);

  const fetchQuizResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quiz/results/${quizId}`);
      
      if (!response.ok) {
        throw new Error('Quiz results not found');
      }
      
      const data = await response.json();
      setQuizData(data.data);
    } catch (err) {
      console.error('Error fetching quiz results:', err);
      setError(err.message);
      toast.error('Unable to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out my personalized wellness recommendations from Taste of Gratitude!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Wellness Quiz Results',
          text: shareText,
          url: shareUrl
        });
        toast.success('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  const handleAddToCart = (product) => {
    window.location.href = `/order?add=${product.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Quiz Results Not Found</CardTitle>
            <CardDescription>
              This quiz result may have expired or doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = '/catalog'}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Take the Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, answers, recommendations, completedAt } = quizData;
  
  const goalLabels = {
    immune: { label: 'Boost Immunity', icon: '❤️', color: 'bg-red-100 text-red-700' },
    gut: { label: 'Gut Health', icon: '🌿', color: 'bg-green-100 text-green-700' },
    energy: { label: 'Natural Energy', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
    skin: { label: 'Radiant Glow', icon: '☀️', color: 'bg-orange-100 text-orange-700' },
    calm: { label: 'Calm Focus', icon: '🎯', color: 'bg-blue-100 text-blue-700' }
  };
  
  const currentGoal = goalLabels[answers.goal] || goalLabels.immune;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-emerald-600">
            Taste of Gratitude
          </a>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your Perfect Blend ✨
          </h1>
          <p className="text-xl text-gray-600 mb-1">
            Personalized for {customer.name}
          </p>
          <Badge className={`${currentGoal.color} mt-2`}>
            {currentGoal.icon} {currentGoal.label}
          </Badge>
        </div>

        {/* Quiz Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Wellness Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">Primary Goal</span>
                <span className="font-semibold text-gray-900">{currentGoal.label}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">Preferred Format</span>
                <span className="font-semibold text-gray-900 capitalize">{answers.texture || 'Any'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">Flavor Profile</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {answers.adventure === 'bold' ? 'Bold & Adventurous 🌶️' : 'Smooth & Classic'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Recommendation (Featured) */}
        {recommendations && recommendations.length > 0 && (
          <Card className="mb-6 border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader>
              <Badge className="w-fit bg-yellow-400 text-yellow-900 mb-2">
                ⭐ Top Pick for You
              </Badge>
              <CardTitle className="text-2xl">{recommendations[0].name}</CardTitle>
              <CardDescription className="text-base text-gray-700">
                {recommendations[0].recommendationReason}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-emerald-600">
                  ${((recommendations[0].price || 0) / 100).toFixed(2)}
                </div>
                <Button 
                  onClick={() => handleAddToCart(recommendations[0])}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Recommendations */}
        {recommendations && recommendations.length > 1 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">More Recommendations</h2>
            <div className="grid gap-4">
              {recommendations.slice(1, 4).map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {product.recommendationReason}
                        </p>
                        <div className="text-2xl font-bold text-emerald-600">
                          ${((product.price || 0) / 100).toFixed(2)}
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleAddToCart(product)}
                        className="ml-4 bg-emerald-600 hover:bg-emerald-700"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Why Sea Moss */}
        <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🌊 Why Sea Moss?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-emerald-600 mr-2">✓</span>
                <span><strong>92+ Essential Minerals</strong> - Complete nutrition in every serving</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-600 mr-2">✓</span>
                <span><strong>100% Natural</strong> - Wildcrafted and small-batch crafted</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-600 mr-2">✓</span>
                <span><strong>Immune Support</strong> - Boost your natural defenses</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-600 mr-2">✓</span>
                <span><strong>Gut Health</strong> - Prebiotic properties for digestion</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => window.location.href = '/catalog'}
            variant="outline"
            size="lg"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Retake Quiz
          </Button>
          <Button 
            onClick={() => window.location.href = '/catalog'}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Browse All Products
          </Button>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Quiz completed on {new Date(completedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <p className="mt-2">
            Questions? Contact us at{' '}
            <a href="mailto:hello@tasteofgratitude.com" className="text-emerald-600 hover:underline">
              hello@tasteofgratitude.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
