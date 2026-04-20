'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Zap, 
  Heart, 
  Shield, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Leaf,
  Droplets,
  Sun,
  Moon,
  Star,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const questions = [
  {
    id: 'goal',
    question: "What's your primary wellness goal?",
    subtitle: "We'll recommend the perfect sea moss blend for your needs",
    options: [
      { id: 'energy', label: 'More Energy', icon: Zap, color: 'bg-amber-500', description: 'Combat fatigue, boost vitality' },
      { id: 'skin', label: 'Better Skin', icon: Sun, color: 'bg-pink-500', description: 'Clear complexion, natural glow' },
      { id: 'immunity', label: 'Immune Support', icon: Shield, color: 'bg-emerald-500', description: 'Strengthen defenses, stay healthy' },
      { id: 'digestion', label: 'Digestive Health', icon: Heart, color: 'bg-teal-500', description: 'Gut balance, better digestion' }
    ]
  },
  {
    id: 'preference',
    question: "How do you prefer to take your wellness?",
    subtitle: "Choose your ideal consumption method",
    options: [
      { id: 'spoon', label: 'Spoon Straight', icon: Droplets, color: 'bg-blue-500', description: 'Pure sea moss gel, potent and direct' },
      { id: 'smoothie', label: 'Blend in Smoothie', icon: Leaf, color: 'bg-green-500', description: 'Mix with fruits, creamy and delicious' },
      { id: 'drink', label: 'Refreshing Juice', icon: Droplets, color: 'bg-cyan-500', description: 'Light and hydrating, easy to enjoy' },
      { id: 'any', label: 'Any Way Works', icon: Sparkles, color: 'bg-purple-500', description: 'Flexible, surprise me!' }
    ]
  },
  {
    id: 'experience',
    question: "Is this your first time with sea moss?",
    subtitle: "We'll tailor the experience to your comfort level",
    options: [
      { id: 'beginner', label: 'Complete Beginner', icon: Star, color: 'bg-indigo-500', description: 'New to sea moss, need guidance' },
      { id: 'tried', label: 'Tried Before', icon: Moon, color: 'bg-slate-500', description: 'Had sea moss, looking for quality' },
      { id: 'regular', label: 'Daily User', icon: CheckCircle2, color: 'bg-emerald-600', description: 'Sea moss veteran, want the best' }
    ]
  }
];

const recommendations = {
  // Goal: Energy
  'energy-spoon-beginner': {
    product: 'Golden Glow Gel',
    slug: 'golden-glow-gel',
    reason: 'Pineapple + turmeric = natural energy boost with anti-inflammatory benefits. Easy spoon serving.',
    tip: 'Start with 1 tablespoon each morning for sustained energy throughout the day.'
  },
  'energy-smoothie-beginner': {
    product: 'Golden Glow Gel',
    slug: 'golden-glow-gel',
    reason: 'Perfect for morning smoothies. Pineapple and turmeric blend seamlessly.',
    tip: 'Blend 2 tablespoons with banana, mango, and almond milk for an energy smoothie.'
  },
  'energy-drink-beginner': {
    product: 'Kissed by Gods',
    slug: 'kissed-by-gods',
    reason: 'Refreshing lemonade with chlorophyll and sea moss for instant hydration + energy.',
    tip: 'Drink chilled for an afternoon pick-me-up that beats coffee.'
  },
  'energy-any-beginner': {
    product: 'Starter Bundle',
    slug: 'golden-glow-gel',
    reason: 'Golden Glow Gel for versatility + Kissed by Gods for convenience.',
    tip: 'Mix it up! Use gel in smoothies on weekdays, grab juice on busy days.'
  },
  
  // Goal: Skin
  'skin-spoon-beginner': {
    product: 'Golden Glow Gel',
    slug: 'golden-glow-gel',
    reason: 'Turmeric + vitamin C from pineapple = glowing skin from within.',
    tip: 'Take daily for 3-4 weeks to see skin transformation. Consistency is key!'
  },
  'skin-smoothie-beginner': {
    product: 'Golden Glow Gel',
    slug: 'golden-glow-gel',
    reason: 'Blend with berries for antioxidant skin boost.',
    tip: 'Try: 2 tbsp Golden Glow + mixed berries + coconut water. Skin loves this!'
  },
  'skin-drink-beginner': {
    product: 'SuppleMint',
    slug: 'supplemint',
    reason: 'Mint + ginger + sea moss. Refreshing and great for skin clarity.',
    tip: 'The mint aids digestion, which reflects in clearer skin.'
  },
  
  // Goal: Immunity
  'immunity-spoon-beginner': {
    product: 'Healing Harmony',
    slug: 'healing-harmony',
    reason: 'Soursop + cinnamon + star anise = immune system powerhouse.',
    tip: 'Take daily, especially during cold/flu season for maximum protection.'
  },
  'immunity-smoothie-beginner': {
    product: 'Healing Harmony',
    slug: 'healing-harmony',
    reason: 'Blend with citrus fruits for vitamin C + soursop immunity combo.',
    tip: 'Add orange and lemon to your smoothie for immune-boosting synergy.'
  },
  'immunity-drink-beginner': {
    product: 'Rejuvenate',
    slug: 'rejuvenate',
    reason: 'Grapefruit + turmeric + cayenne = immune support with metabolism boost.',
    tip: 'The cayenne adds warmth and circulation support. Great for winter!'
  },
  
  // Goal: Digestion
  'digestion-spoon-beginner': {
    product: 'Healing Harmony',
    slug: 'healing-harmony',
    reason: 'Cinnamon + sea moss = gut health and digestive support.',
    tip: 'Take on an empty stomach in the morning for best digestive benefits.'
  },
  'digestion-smoothie-beginner': {
    product: 'Golden Glow Gel',
    slug: 'golden-glow-gel',
    reason: 'Ginger + pineapple enzymes aid digestion naturally.',
    tip: 'Blend with papaya for a digestion-friendly breakfast smoothie.'
  },
  'digestion-drink-beginner': {
    product: 'SuppleMint',
    slug: 'supplemint',
    reason: 'Mint + ginger = classic digestive aid in refreshing form.',
    tip: 'Perfect after meals. Mint soothes, ginger stimulates digestion.'
  },
  
  // Experienced users (simplified)
  'energy-spoon-tried': { product: 'Golden Glow Gel', slug: 'golden-glow-gel', reason: 'You know quality. This wildcrafted gel delivers.', tip: 'Experienced users often prefer 2-3 tbsp daily.' },
  'skin-spoon-tried': { product: 'Golden Glow Gel', slug: 'golden-glow-gel', reason: 'Premium wildcrafted sea moss for noticeable skin results.', tip: 'Consider double serving for faster results.' },
  'immunity-spoon-tried': { product: 'Healing Harmony', slug: 'healing-harmony', reason: 'Soursop blend for serious immune support.', tip: 'Combine with your existing wellness routine.' },
  'digestion-spoon-tried': { product: 'Healing Harmony', slug: 'healing-harmony', reason: 'Advanced digestive formula with warming spices.', tip: 'Pair with probiotic foods for gut health synergy.' },
  
  // Regular users
  'energy-any-regular': { product: 'Golden Glow Gel', slug: 'golden-glow-gel', reason: 'The gold standard. You deserve the best wildcrafted sea moss.', tip: 'Subscribe & Save 20% for your daily ritual.' },
  'skin-any-regular': { product: 'Golden Glow Gel', slug: 'golden-glow-gel', reason: 'Premium grade for your established wellness routine.', tip: 'Consider the 3-pack for consistent supply.' },
  'immunity-any-regular': { product: 'Healing Harmony', slug: 'healing-harmony', reason: 'Expert-level immune support formula.', tip: 'Rotate with Golden Glow for complete coverage.' },
  'digestion-any-regular': { product: 'Healing Harmony', slug: 'healing-harmony', reason: 'Advanced formula for digestive wellness veterans.', tip: 'Best taken consistently at same time daily.' }
};

// Fallback recommendation
const defaultRecommendation = {
  product: 'Golden Glow Gel',
  slug: 'golden-glow-gel',
  reason: 'Our bestselling wildcrafted sea moss gel with pineapple, turmeric & ginger. Perfect for beginners and experts alike.',
  tip: 'Start with 1 tablespoon daily. Most customers feel results within 2-3 weeks.'
};

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const handleAnswer = (questionId, optionId) => {
    setAnswers({ ...answers, [questionId]: optionId });
    
    if (step < questions.length - 1) {
      setTimeout(() => setStep(step + 1), 300);
    } else {
      // Last question - show email capture before results
      setTimeout(() => setShowEmailCapture(true), 300);
    }
  };

  const handleBack = () => {
    if (showEmailCapture) {
      setShowEmailCapture(false);
      setStep(questions.length - 1);
    } else if (step > 0) {
      setStep(step - 1);
    }
  };

  const getRecommendation = () => {
    const key = `${answers.goal}-${answers.preference}-${answers.experience}`;
    const partialKey1 = `${answers.goal}-${answers.preference}`;
    const partialKey2 = `${answers.goal}-any-${answers.experience}`;
    
    return recommendations[key] || 
           recommendations[partialKey1 + '-beginner'] || 
           recommendations[partialKey2] || 
           recommendations[`${answers.goal}-spoon-beginner`] ||
           defaultRecommendation;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    
    setLoading(true);
    
    try {
      // Save quiz result + email to database
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          answers,
          recommendation: getRecommendation(),
          source: 'quiz_funnel'
        })
      });
      
      if (response.ok) {
        const rec = getRecommendation();
        setRecommendation(rec);
        setShowEmailCapture(false);
        toast.success('Your personalized recommendation is ready!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      // Even if API fails, show recommendation
      const rec = getRecommendation();
      setRecommendation(rec);
      setShowEmailCapture(false);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-emerald-600 text-white px-4 py-2 text-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Find Your Perfect Match
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Discover Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              {' '}Wellness Formula
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            3 questions to find your perfect sea moss match
          </p>
        </div>

        {/* Progress Bar */}
        {!showEmailCapture && !recommendation && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {step + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Quiz Questions */}
        <AnimatePresence mode="wait">
          {!showEmailCapture && !recommendation && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 shadow-xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentQuestion.question}
                </h2>
                <p className="text-gray-600 mb-6">
                  {currentQuestion.subtitle}
                </p>

                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers[currentQuestion.id] === option.id;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleAnswer(currentQuestion.id, option.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 group ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full ${option.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {option.label}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {option.description}
                          </p>
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-all ${
                          isSelected ? 'text-emerald-500 translate-x-1' : 'text-gray-300'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Email Capture */}
          {showEmailCapture && !recommendation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 md:p-8 shadow-xl text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Your Perfect Match is Ready!
                </h2>
                <p className="text-gray-600 mb-6">
                  Enter your email to see your personalized recommendation
                  <br />
                  <span className="text-sm text-emerald-600 font-medium">
                    + get 15% off your first order
                  </span>
                </p>

                <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 h-12"
                      required
                    />
                    <Button 
                      type="submit" 
                      className="h-12 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          See My Match
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    No spam, ever. Unsubscribe anytime.
                  </p>
                </form>

                <button
                  onClick={() => {
                    setShowEmailCapture(false);
                    setRecommendation(getRecommendation());
                  }}
                  className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Skip, just show my recommendation
                </button>
              </Card>
            </motion.div>
          )}

          {/* Recommendation Result */}
          {recommendation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="p-6 md:p-8 shadow-xl">
                <div className="text-center mb-6">
                  <Badge className="mb-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Your Perfect Match
                  </Badge>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {recommendation.product}
                  </h2>
                  <p className="text-gray-600">{recommendation.reason}</p>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-emerald-800 mb-2 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Pro Tip
                  </h4>
                  <p className="text-emerald-700 text-sm">{recommendation.tip}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push(`/product/${recommendation.slug}`)}
                    className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-lg"
                  >
                    Shop {recommendation.product}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/catalog')}
                    className="h-14 px-6"
                  >
                    Browse All Products
                  </Button>
                </div>

                {email && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Check your inbox for a 15% off coupon code!
                  </p>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back Button */}
        {(step > 0 || showEmailCapture) && !recommendation && (
          <button
            onClick={handleBack}
            className="mt-6 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </button>
        )}

        {/* Trust Badges */}
        {!recommendation && (
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Shield className="w-4 h-4 mr-1 text-emerald-500" />
              100% Wildcrafted
            </span>
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" />
              92 Essential Minerals
            </span>
            <span className="flex items-center">
              <Heart className="w-4 h-4 mr-1 text-emerald-500" />
              Loved by 2,000+
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
