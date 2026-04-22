'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  RefreshCw, 
  CheckCircle2,
  Sparkles,
  Package,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    description: 'Delivered every 30 days',
    discount: 15,
    interval: 30,
    badge: 'Most Popular'
  },
  {
    id: 'biweekly',
    name: 'Bi-Weekly',
    description: 'Delivered every 14 days',
    discount: 10,
    interval: 14,
    badge: null
  },
  {
    id: 'weekly',
    name: 'Weekly',
    description: 'Fresh delivery every 7 days',
    discount: 20,
    interval: 7,
    badge: 'Best Value'
  }
];

const SUBSCRIPTION_BENEFITS = [
  'Never run out of your wellness routine',
  'Skip or pause anytime',
  'Priority pickup at all markets',
  'Exclusive subscriber-only discounts',
  'Early access to new flavors'
];

export default function SubscriptionSelector({ 
  product, 
  selectedVariation, 
  quantity = 1,
  onAddToCart,
  isAdding 
}) {
  const [isSubscription, setIsSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showDetails, setShowDetails] = useState(false);

  const basePrice = selectedVariation?.price || product?.price || 0;
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
  const discountedPrice = isSubscription 
    ? basePrice * (1 - plan.discount / 100) 
    : basePrice;
  const totalPrice = discountedPrice * quantity;
  const monthlySavings = isSubscription 
    ? (basePrice - discountedPrice) * quantity 
    : 0;

  const handleSubscribe = async () => {
    if (!selectedVariation) {
      toast.error('Please select a size option first');
      return;
    }

    try {
      const subscriptionData = {
        type: 'subscription',
        plan: selectedPlan,
        interval: plan.interval,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          variation: selectedVariation,
          quantity
        },
        price: {
          base: basePrice,
          discounted: discountedPrice,
          total: totalPrice,
          discountPercent: plan.discount
        }
      };

      // Add to cart with subscription flag
      await onAddToCart({
        ...product,
        isSubscription: true,
        subscriptionPlan: selectedPlan,
        subscriptionInterval: plan.interval
      });

      toast.success(`Subscribed! ${plan.name} delivery starting soon.`);
    } catch (error) {
      toast.error('Failed to create subscription');
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-emerald-100">
      {/* Toggle Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isSubscription ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Subscribe & Save</h3>
              <p className="text-sm text-gray-600">Up to 20% off + priority pickup</p>
            </div>
          </div>
          <button
            onClick={() => setIsSubscription(!isSubscription)}
            className={`w-14 h-8 rounded-full transition-colors relative ${
              isSubscription ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <motion.div
              className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm"
              animate={{ left: isSubscription ? '28px' : '4px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSubscription && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 border-t border-emerald-100">
              {/* Plan Selection */}
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Select delivery frequency:</p>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === plan.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPlan === plan.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                        }`}>
                          {selectedPlan === plan.id && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{plan.name}</span>
                            {plan.badge && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                {plan.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500 text-white">
                        Save {plan.discount}%
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Regular price</span>
                  <span className="text-gray-500 line-through">${(basePrice * quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subscriber price</span>
                  <span className="text-emerald-600 font-semibold">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">You save</span>
                  <span className="text-emerald-600 font-semibold">${monthlySavings.toFixed(2)}/order</span>
                </div>
                <div className="border-t border-emerald-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total today</span>
                    <span className="text-2xl font-bold text-emerald-600">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={isAdding || !selectedVariation}
                className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-lg font-semibold"
              >
                {isAdding ? (
                  <>Subscribing... (<motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </motion.span>)</>
                ) : (
                  <>
                    Subscribe & Save {plan.discount}%
                    <Sparkles className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              {/* Benefits Toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700 mt-4 flex items-center justify-center gap-1"
              >
                {showDetails ? 'Hide' : 'See'} subscription benefits
                <motion.span
                  animate={{ rotate: showDetails ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.span>
              </button>

              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 space-y-2"
                >
                  {SUBSCRIPTION_BENEFITS.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      You can modify, skip, or cancel your subscription anytime from your account.
                      No commitments, no hassle.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
