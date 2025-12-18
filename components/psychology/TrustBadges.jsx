'use client';

import { Shield, Award, RefreshCw, Lock, CheckCircle, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_ICONS = [
  { name: 'Visa', color: '#1A1F71' },
  { name: 'Mastercard', color: '#EB001B' },
  { name: 'Amex', color: '#006FCF' },
  { name: 'Square', color: '#006AFF' },
];

export default function TrustBadges({ 
  layout = 'horizontal', 
  compact = false,
  showPaymentMethods = false,
  className 
}) {
  const badges = [
    {
      icon: Shield,
      text: "30-Day Money Back",
      shortText: "30-Day Guarantee",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    },
    {
      icon: Lock,
      text: "Secure Checkout",
      shortText: "Secure",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: Award,
      text: "Lab Tested 92 Minerals",
      shortText: "Lab Tested",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: RefreshCw,
      text: "Free Returns",
      shortText: "Free Returns",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    }
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn(
        layout === 'horizontal'
          ? "flex flex-wrap items-center justify-center gap-3"
          : "grid grid-cols-1 md:grid-cols-2 gap-3",
        compact && "gap-2"
      )}>
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div 
              key={index}
              className={cn(
                "flex items-center gap-2 rounded-lg border transition-all duration-300",
                "hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5",
                badge.bgColor,
                badge.borderColor,
                compact 
                  ? "px-3 py-2" 
                  : "px-4 py-3 shadow-sm"
              )}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className={cn(
                "flex items-center justify-center rounded-full",
                compact ? "w-6 h-6" : "w-8 h-8",
                badge.bgColor
              )}>
                <Icon className={cn(
                  badge.color,
                  compact ? "h-3.5 w-3.5" : "h-4 w-4"
                )} />
              </div>
              <span className={cn(
                "font-medium text-gray-700",
                compact ? "text-xs" : "text-sm"
              )}>
                {compact ? badge.shortText : badge.text}
              </span>
            </div>
          );
        })}
      </div>

      {showPaymentMethods && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-xs text-gray-500 mr-1">We accept:</span>
          <div className="flex items-center gap-3">
            {PAYMENT_ICONS.map((payment, index) => (
              <div
                key={payment.name}
                className={cn(
                  "flex items-center justify-center px-2 py-1 rounded",
                  "bg-white border border-gray-200 shadow-sm",
                  "transition-all duration-200 hover:shadow-md hover:scale-105"
                )}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
                title={payment.name}
              >
                <span 
                  className="text-xs font-bold"
                  style={{ color: payment.color }}
                >
                  {payment.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrustBadgeInline({ type = 'secure', className }) {
  const config = {
    secure: {
      icon: Lock,
      text: "Secure Checkout",
      color: "text-blue-600"
    },
    guarantee: {
      icon: Shield,
      text: "30-Day Guarantee",
      color: "text-emerald-600"
    },
    verified: {
      icon: CheckCircle,
      text: "Verified Seller",
      color: "text-green-600"
    }
  };

  const badge = config[type] || config.secure;
  const Icon = badge.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-sm",
      badge.color,
      className
    )}>
      <Icon className="h-4 w-4" />
      <span className="font-medium">{badge.text}</span>
    </span>
  );
}
