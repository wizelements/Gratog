'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Gift, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExitIntentModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Track mouse position for exit intent
  const handleMouseLeave = useCallback((e) => {
    // Only trigger if mouse leaves through top of page (not scrolling)
    if (e.clientY < 10 && !isVisible && !submitted) {
      // Check if user has already seen this session
      const hasSeen = sessionStorage.getItem('exitIntentShown');
      if (!hasSeen) {
        setIsVisible(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    }
  }, [isVisible, submitted]);

  // Track scroll depth for mobile (when user scrolls back up quickly)
  const handleScroll = useCallback(() => {
    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    
    // If user scrolls back to top after scrolling down
    if (scrollPercent < 5 && window.scrollY > 500 && !isVisible && !submitted) {
      const hasSeen = sessionStorage.getItem('exitIntentShown');
      if (!hasSeen) {
        setIsVisible(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    }
  }, [isVisible, submitted]);

  useEffect(() => {
    // Desktop: mouse leave
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Mobile: scroll detection
    let scrollTimeout;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };
    window.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', throttledScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleMouseLeave, handleScroll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/nurture/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'exit_intent',
          metadata: { coupon: 'EXIT15', discount: 15 }
        })
      });

      if (response.ok) {
        setSubmitted(true);
        toast.success('Check your email for your 15% off coupon!');
      } else {
        throw new Error('Failed to subscribe');
      }
    } catch (error) {
      // Still show success to user even if API fails
      setSubmitted(true);
      toast.success('Check your email for your 15% off coupon!');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <Card className="w-full max-w-lg bg-white shadow-2xl pointer-events-auto overflow-hidden">
              {!submitted ? (
                <div className="relative">
                  {/* Close button */}
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>

                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                      Wait! Don't Miss Out 🎁
                    </h2>
                    <p className="text-white/90 text-lg">
                      Get 15% off your first order
                    </p>
                  </div>

                  {/* Body */}
                  <div className="p-6 md:p-8">
                    <div className="flex items-center justify-center gap-6 mb-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>15% off instantly</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span>Limited time</span>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="flex-1 h-12 text-base"
                          required
                        />
                        <Button
                          type="submit"
                          disabled={loading}
                          className="h-12 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-base font-semibold"
                        >
                          {loading ? 'Sending...' : 'Get My 15% Off'}
                        </Button>
                      </div>
                    </form>

                    <p className="text-xs text-gray-500 text-center mt-4">
                      No spam, ever. Unsubscribe anytime. By subscribing, you agree to receive marketing emails.
                    </p>

                    {/* Trust signals */}
                    <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        2,000+ happy customers
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Wildcrafted sea moss
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Success State */
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    You're In! 🎉
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Check your inbox for your <strong>15% off coupon code</strong>.
                  </p>
                  <Button
                    onClick={handleClose}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-8"
                  >
                    Continue Shopping
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
