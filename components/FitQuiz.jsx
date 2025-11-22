'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Target, Zap, Heart, Leaf, Sun, AlertCircle } from 'lucide-react';
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

// Utility: Normalize price to dollars (handles both cent and dollar formats)
function normalizePrice(product) {
  // If priceCents exists and is > 100, it's likely in cents
  if (product.priceCents && product.priceCents > 100) {
    return product.priceCents / 100;
  }
  // If price exists and is > 0, use it
  if (product.price && product.price > 0) {
    return product.price;
  }
  // Default to 0
  return 0;
}

// Utility: Filter products with valid prices
function filterValidProducts(products) {
  return products.filter(product => {
    const price = normalizePrice(product);
    return price > 0;
  });
}

export default function FitQuiz({ onRecommendations, onAddToCart }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    goal: null,
    texture: null,
    adventure: null
  });
  const [customer, setCustomer] = useState({
    name: '',
    email: ''
  });
  const [emailConsent, setEmailConsent] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [quizId, setQuizId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showError, setShowError] = useState(false);

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
      // After all 3 questions, move to lead capture (step 3.5)
      setStep(3.5);
    }
  };

  const validateLeadCapture = () => {
    const newErrors = {};
    
    if (!customer.name || customer.name.trim().length < 2) {
      newErrors.name = 'Please enter your name';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customer.email || !emailRegex.test(customer.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLeadCaptureSubmit = async () => {
    // Reset error state
    setShowError(false);
    setLoading(true);
    
    try {
      // Import quiz utils
      const { fetchRecommendations, submitQuizResults } = await import('@/lib/quiz-utils');
      
      // Fetch all products for heuristic fallback
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      const allProducts = productsData.products || [];
      
      // Get recommendations (API or heuristic)
      const result = await fetchRecommendations(answers, allProducts);
      
      // CRITICAL: Filter products to only show those with valid prices
      const validRecommendations = filterValidProducts(result.recommendations);
      
      if (validRecommendations.length === 0) {
        // If no valid recommendations, show fallback
        throw new Error('No products with valid pricing found');
      }
      
      setRecommendations(validRecommendations);
      
      // Show results immediately
      setStep(4);
      
      // Track analytics
      AnalyticsSystem.trackQuizCompleted(
        answers.goal, 
        answers.adventure === 'bold', 
        validRecommendations
      );
      
      // If email provided, submit async (non-blocking)
      if (customer.email && validateLeadCapture()) {
        submitQuizResults(customer, answers, validRecommendations).then(submitData => {
          if (submitData.success) {
            setQuizId(submitData.quizId);
            if (submitData.emailSent) {
              toast.success('Check your email for personalized recommendations!');
            }
          }
        }).catch(err => {
          console.warn('[GratOG Quiz] Email submission failed (non-blocking):', err);
        });
      }
      
      // Show message based on source
      if (result.source === 'heuristic') {
        toast.info('Showing best matches for you', {
          description: 'Our recommendations are based on your preferences'
        });
      } else {
        toast.success(`Found ${validRecommendations.length} perfect matches!`);
      }
      
      if (onRecommendations) {
        onRecommendations(validRecommendations);
      }
    } catch (error) {
      console.error('[GratOG Quiz] Quiz error:', error);
      setShowError(true);
      
      // Show user-friendly error
      toast.error('Unable to load recommendations', {
        description: 'Please try again or browse our full catalog'
      });
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
    setCustomer({ name: '', email: '' });
    setEmailConsent(true);
    setRecommendations([]);
    setQuizId(null);
    setErrors({});
    setShowError(false);
  };

  // Error State
  if (showError) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-red-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-red-700">Unable to Load Recommendations</CardTitle>
          <CardDescription className="text-base">
            We encountered an issue while creating your personalized blend.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            Don't worry! You can still browse our full collection of premium wellness products.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={resetQuiz}
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              🔄 Try Quiz Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/catalog'}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              📚 Browse All Products
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <Button 
            onClick={handleStart} 
            size="lg" 
            data-testid="quiz-start-button"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
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

  if (step === 3.5) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Save Your Personalized Blend</CardTitle>
          <CardDescription className="text-base">
            Get your results via email and unlock exclusive wellness tips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your name"
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                id="email"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="your.email@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            <div className="flex items-start space-x-2 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <input
                id="emailConsent"
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="emailConsent" className="text-sm text-gray-700">
                Email me my personalized results and wellness tips. You can unsubscribe anytime.
              </label>
            </div>
            
            <Button
              onClick={handleLeadCaptureSubmit}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-semibold"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Getting Your Results...
                </>
              ) : (
                'Get My Personalized Blend ✨'
              )}
            </Button>
            
            <Button
              onClick={async () => {
                // Skip email, show results immediately
                setCustomer({ name: '', email: '' });
                await handleLeadCaptureSubmit();
              }}
              disabled={loading}
              variant="outline"
              className="w-full h-12 text-base border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              Skip for Now - Show My Results
            </Button>
            
            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to receive personalized product recommendations. 
              Your privacy is important to us.
            </p>
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
          {quizId && (
            <div className="mt-3">
              <a 
                href={`/quiz/results/${quizId}`}
                className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                📧 View & share your full results page →
              </a>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((product, index) => {
                const displayPrice = normalizePrice(product);
                return (
                  <div key={product.sku || product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{product.name}</h4>
                        {index === 0 && <Badge className="bg-emerald-100 text-emerald-700">Top Pick</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                      <p className="font-medium text-emerald-600">${displayPrice.toFixed(2)}</p>
                    </div>
                    <Button 
                      onClick={() => handleAddToCart(product)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Add to Cart
                    </Button>
                  </div>
                );
              })}
              <div className="flex flex-col gap-3 pt-4">
                {/* Action Buttons Row 1 */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                  >
                    ← Modify Answers
                  </Button>
                  <Button 
                    onClick={() => {
                      // Add all recommendations to cart
                      recommendations.forEach(product => handleAddToCart(product));
                      toast.success(`Added ${recommendations.length} products to your cart!`);
                    }}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                  >
                    💾 Save All My Picks
                  </Button>
                </div>
                
                {/* Action Buttons Row 2 */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetQuiz} className="flex-1">
                    🔄 Retake Quiz
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/catalog'}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    📚 Browse All Products
                  </Button>
                </div>
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