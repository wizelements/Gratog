'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Target, Zap, Heart, Leaf, Sun } from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsSystem from '@/lib/analytics';

const GOALS = [
  { id: 'immune', label: 'Boost Immunity', icon: Heart, color: 'bg-red-100 text-red-700', description: 'Support your natural defenses' },
  { id: 'gut', label: 'Gut Health', icon: Leaf, color: 'bg-green-100 text-green-700', description: 'Digestive wellness & clean energy' },
  { id: 'energy', label: 'Natural Energy', icon: Zap, color: 'bg-yellow-100 text-yellow-700', description: 'Sustained vitality without crashes' },
  { id: 'skin', label: 'Radiant Glow', icon: Sun, color: 'bg-orange-100 text-orange-700', description: 'Nourish from within for healthy skin' },
  { id: 'calm', label: 'Calm Focus', icon: Target, color: 'bg-blue-100 text-blue-700', description: 'Balanced energy & mental clarity' }
];

const TEXTURES = [
  { id: 'gel', label: 'Classic Gel', description: 'Rich, nourishing gel - our signature' },
  { id: 'lemonade', label: 'Lemonade Pairing', description: 'Light, refreshing complement' },
  { id: 'shot', label: 'Quick Shot', description: '2oz power dose for busy days' }
];

const ADVENTURE_LEVELS = [
  { id: 'mild', label: 'Keep it Smooth', description: 'Classic, approachable flavors' },
  { id: 'bold', label: 'Bring the Heat! 🌶️', description: 'Ready for bold, adventurous tastes' }
];

export default function FitQuiz({ onRecommendations, onAddToCart }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    goal: null,
    texture: null,
    adventure: null
  });
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleStart = () => {
    AnalyticsSystem.trackQuizStarted();
    setStep(1);
  };

  const handleAnswer = (key, value) => {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Final step - get recommendations
      getRecommendations(newAnswers);
    }
  };

  const getRecommendations = async (quizAnswers) => {
    setLoading(true);
    try {
      const response = await fetch('/api/quiz/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizAnswers)
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
        AnalyticsSystem.trackQuizCompleted(
          quizAnswers.goal, 
          quizAnswers.adventure === 'bold', 
          data.recommendations || []
        );
        setStep(4);
        if (onRecommendations) {
          onRecommendations(data.recommendations || []);
        }
      } else {
        throw new Error('Failed to get recommendations');
      }
    } catch (error) {
      console.error('Quiz error:', error);
      toast.error('Unable to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      // Redirect to order page with product
      window.location.href = `/order?add=${product.id}`;
    }
    toast.success(`Added ${product.name} to cart!`);
    AnalyticsSystem.trackPDPView(product.id || product.sku);
  };

  const resetQuiz = () => {
    setStep(0);
    setAnswers({ goal: null, texture: null, adventure: null });
    setRecommendations([]);
  };

  if (step === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Find Your Perfect Blend</CardTitle>
          <CardDescription className="text-lg">
            Take our 60-second wellness quiz to discover sea moss products crafted for your unique goals
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {GOALS.map((goal) => {
              const Icon = goal.icon;
              return (
                <div key={goal.id} className="flex flex-col items-center p-3 rounded-lg border">
                  <Icon className="w-6 h-6 mb-2 text-emerald-600" />
                  <span className="text-sm font-medium">{goal.label}</span>
                </div>
              );
            })}
          </div>
          <Button onClick={handleStart} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            Start Your Journey
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 1) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>What's your primary wellness goal?</CardTitle>
          <CardDescription>Choose the area you'd most like to support</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {GOALS.map((goal) => {
              const Icon = goal.icon;
              return (
                <Button
                  key={goal.id}
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => handleAnswer('goal', goal.id)}
                >
                  <Icon className="w-5 h-5 mr-3 text-emerald-600" />
                  <div className="text-left">
                    <div className="font-medium">{goal.label}</div>
                    <div className="text-sm text-muted-foreground">{goal.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>How do you prefer to enjoy sea moss?</CardTitle>
          <CardDescription>Select your favorite texture and experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {TEXTURES.map((texture) => (
              <Button
                key={texture.id}
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleAnswer('texture', texture.id)}
              >
                <div className="text-left">
                  <div className="font-medium">{texture.label}</div>
                  <div className="text-sm text-muted-foreground">{texture.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 3) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>What's your adventure level?</CardTitle>
          <CardDescription>Are you ready for bold flavors and unique combinations?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {ADVENTURE_LEVELS.map((level) => (
              <Button
                key={level.id}
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleAnswer('adventure', level.id)}
                disabled={loading}
              >
                <div className="text-left">
                  <div className="font-medium">{level.label}</div>
                  <div className="text-sm text-muted-foreground">{level.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 4) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your Perfect Blend ✨</CardTitle>
          <CardDescription>
            Based on your answers, here are our top recommendations crafted just for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((product, index) => (
                <div key={product.sku} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{product.name}</h4>
                      {index === 0 && <Badge className="bg-emerald-100 text-emerald-700">Top Pick</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                    <p className="font-medium text-emerald-600">${(product.priceCents / 100).toFixed(2)}</p>
                  </div>
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Add to Cart
                  </Button>
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetQuiz} className="flex-1">
                  Retake Quiz
                </Button>
                <Button 
                  onClick={() => window.location.href = '/catalog'}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Browse All Products
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="mb-4">No specific recommendations found. Browse our full catalog!</p>
              <Button onClick={() => window.location.href = '/catalog'}>
                View All Products
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}