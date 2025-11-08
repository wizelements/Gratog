'use client';

import { Check } from 'lucide-react';

/**
 * Visual progress indicator for multi-step checkout
 * Shows current step, completed steps, and upcoming steps
 */
export default function CheckoutProgress({ currentStep = 1, steps }) {
  const defaultSteps = [
    { id: 1, name: 'Cart Review', description: 'Review your items' },
    { id: 2, name: 'Details', description: 'Shipping & contact' },
    { id: 3, name: 'Payment', description: 'Secure checkout' },
    { id: 4, name: 'Confirmation', description: 'Order complete' }
  ];

  const progressSteps = steps || defaultSteps;
  const progress = ((currentStep - 1) / (progressSteps.length - 1)) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Mobile Progress Bar */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {progressSteps.length}
          </span>
          <span className="text-sm text-gray-500">
            {progressSteps[currentStep - 1]?.name}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Desktop Step Indicator */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" style={{ zIndex: 0 }} />
          <div 
            className="absolute top-5 left-0 h-0.5 bg-emerald-600 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%`, zIndex: 0 }}
          />

          {/* Steps */}
          <div className="relative flex justify-between" style={{ zIndex: 1 }}>
            {progressSteps.map((step, index) => {
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              const isUpcoming = step.id > currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center group">
                  {/* Circle */}
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-300 ease-out
                      ${isCompleted ? 'bg-emerald-600 scale-100' : ''}
                      ${isCurrent ? 'bg-emerald-600 scale-110 ring-4 ring-emerald-100 animate-pulse-gentle' : ''}
                      ${isUpcoming ? 'bg-gray-200 scale-90' : ''}
                    `}
                  >
                    {isCompleted && (
                      <Check className="h-5 w-5 text-white animate-scale-in" />
                    )}
                    {isCurrent && (
                      <span className="text-white font-bold">{step.id}</span>
                    )}
                    {isUpcoming && (
                      <span className="text-gray-400 font-medium">{step.id}</span>
                    )}
                  </div>

                  {/* Label */}
                  <div className={`
                    mt-3 text-center transition-all duration-300
                    ${isCurrent ? 'scale-105' : 'scale-100'}
                  `}>
                    <div className={`
                      text-sm font-medium
                      ${isCompleted || isCurrent ? 'text-emerald-700' : 'text-gray-400'}
                    `}>
                      {step.name}
                    </div>
                    <div className={`
                      text-xs mt-1
                      ${isCompleted || isCurrent ? 'text-emerald-600' : 'text-gray-400'}
                    `}>
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple linear progress bar
 */
export function SimpleProgress({ value = 0, max = 100, className = '' }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className}`}>
      <div 
        className="bg-emerald-600 h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
        style={{ width: `${percentage}%` }}
      >
        {/* Shimmer effect */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  );
}
