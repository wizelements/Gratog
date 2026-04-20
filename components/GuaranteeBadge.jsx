'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';

/**
 * GuaranteeBadge - Shows money-back guarantee trust signal
 * 
 * Props:
 * - size: 'sm' | 'md' | 'lg' - size variant
 * - variant: 'pill' | 'banner' | 'card' - display style
 * - days: number - guarantee period (default: 90)
 */
export default function GuaranteeBadge({ 
  size = 'md', 
  variant = 'pill',
  days = 90 
}) {
  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-2 px-3',
    lg: 'text-base py-2.5 px-4'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (variant === 'pill') {
    return (
      <motion.div 
        className={`inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 ${sizeClasses[size]}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ShieldCheck className={`${iconSizes[size]} text-emerald-600`} />
        <span className="font-medium">{days}-Day Guarantee</span>
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div 
        className="bg-gradient-to-r from-emerald-50 to-teal-50 border-y border-emerald-100 py-3 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-emerald-800">
          <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div className="text-center">
            <p className="font-semibold">
              {days}-Day Happiness Guarantee
            </p>
            <p className="text-sm text-emerald-600">
              Not satisfied? Full refund, no questions asked.
            </p>
          </div>
          <RefreshCw className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        </div>
      </motion.div>
    );
  }

  if (variant === 'card') {
    return (
      <motion.div 
        className="bg-white rounded-xl border-2 border-emerald-100 p-6 shadow-sm"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">
              {days}-Day Money-Back Guarantee
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              We're confident you'll love our sea moss. But if you're not completely 
              satisfied within {days} days, we'll give you a full refund. No questions asked.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Full refund
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {days} days
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <RefreshCw className="w-3 h-3" />
                No hassle
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

/**
 * TrustBar - Horizontal bar with multiple trust signals
 */
export function TrustBar() {
  const signals = [
    { icon: ShieldCheck, text: '90-Day Guarantee' },
    { icon: RefreshCw, text: 'Free Returns' },
    { icon: Clock, text: 'Fast Shipping' },
  ];

  return (
    <motion.div 
      className="flex flex-wrap justify-center gap-4 md:gap-8 py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      {signals.map((signal, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
          <signal.icon className="w-4 h-4 text-emerald-500" />
          <span>{signal.text}</span>
        </div>
      ))}
    </motion.div>
  );
}
