'use client';

/**
 * CheckoutProgress - Visual progress indicator for 3-step checkout
 */

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CheckoutStage } from '@/stores/checkout';

interface CheckoutProgressProps {
  currentStage: CheckoutStage;
}

const STAGES = [
  { key: 'cart' as CheckoutStage, label: 'Cart', step: 1 },
  { key: 'details' as CheckoutStage, label: 'Details', step: 2 },
  { key: 'review' as CheckoutStage, label: 'Review & Pay', step: 3 }
];

export default function CheckoutProgress({ currentStage }: CheckoutProgressProps) {
  const currentStep = STAGES.find(s => s.key === currentStage)?.step || 1;
  
  return (
    <div className="w-full py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between relative">
          {/* Progress bar background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />
          
          {/* Active progress bar */}
          <motion.div
            className="absolute top-5 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ 
              width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' 
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
          
          {/* Step indicators */}
          {STAGES.map((stage) => {
            const isActive = stage.key === currentStage;
            const isCompleted = stage.step < currentStep;
            
            return (
              <div
                key={stage.key}
                className="relative flex flex-col items-center z-10"
              >
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500'
                      : isActive
                      ? 'bg-white border-emerald-500'
                      : 'bg-white border-gray-300'
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    >
                      {stage.step}
                    </span>
                  )}
                </motion.div>
                
                <motion.span
                  className={`mt-2 text-sm font-medium ${
                    isActive
                      ? 'text-emerald-600'
                      : isCompleted
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }`}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: isActive ? 1 : 0.7 }}
                >
                  {stage.label}
                </motion.span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
