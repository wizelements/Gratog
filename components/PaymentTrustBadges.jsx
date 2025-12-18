'use client';

import { Lock, Shield, CreditCard, CheckCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { name: 'Visa', abbr: 'VISA', color: '#1A1F71' },
  { name: 'Mastercard', abbr: 'MC', color: '#EB001B' },
  { name: 'American Express', abbr: 'AMEX', color: '#006FCF' },
  { name: 'Discover', abbr: 'DISC', color: '#FF6000' },
];

const DIGITAL_WALLETS = [
  { name: 'Apple Pay', icon: '🍎', available: true },
  { name: 'Google Pay', icon: 'G', available: true },
];

export default function PaymentTrustBadges({ 
  variant = 'default',
  showGuarantee = true,
  showSquareBadge = true,
  showDigitalWallets = true,
  className 
}) {
  const isCompact = variant === 'compact';
  const isMinimal = variant === 'minimal';

  return (
    <div className={cn(
      "space-y-4",
      isMinimal && "space-y-2",
      className
    )}>
      {/* SSL/Secure Payment Indicator */}
      <div className={cn(
        "flex items-center justify-center gap-2 p-3 rounded-lg",
        "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200",
        "transition-all duration-300 hover:shadow-sm",
        isMinimal && "p-2"
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
          <Lock className="h-4 w-4 text-green-600" />
        </div>
        <div className={cn("flex flex-col", isMinimal && "flex-row gap-2 items-center")}>
          <span className={cn(
            "font-semibold text-green-800",
            isCompact ? "text-sm" : "text-base"
          )}>
            256-bit SSL Encrypted
          </span>
          {!isMinimal && (
            <span className="text-xs text-green-600">
              Your payment information is secure
            </span>
          )}
        </div>
        <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
      </div>

      {/* Accepted Payment Methods */}
      <div className={cn(
        "p-3 rounded-lg bg-gray-50 border border-gray-200",
        isMinimal && "p-2"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Accepted Payment Methods</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PAYMENT_METHODS.map((method, index) => (
            <div
              key={method.name}
              className={cn(
                "px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm",
                "transition-all duration-200 hover:shadow-md hover:scale-105 hover:border-gray-300",
                "cursor-default"
              )}
              style={{
                animationDelay: `${index * 50}ms`
              }}
              title={method.name}
            >
              <span 
                className="text-xs font-bold tracking-wide"
                style={{ color: method.color }}
              >
                {method.abbr}
              </span>
            </div>
          ))}
        </div>

        {/* Digital Wallets */}
        {showDigitalWallets && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <Smartphone className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500">Digital Wallets:</span>
            {DIGITAL_WALLETS.map((wallet) => (
              <div
                key={wallet.name}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full",
                  "bg-gray-900 text-white text-xs font-medium",
                  "transition-all duration-200 hover:bg-gray-800"
                )}
                title={wallet.name}
              >
                <span>{wallet.icon}</span>
                <span>{wallet.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 30-Day Money-Back Guarantee */}
      {showGuarantee && (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg",
          "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200",
          "transition-all duration-300 hover:shadow-sm hover:border-emerald-300",
          isMinimal && "p-2 gap-2"
        )}>
          <div className={cn(
            "flex items-center justify-center rounded-full bg-emerald-100",
            "transition-transform duration-300 hover:scale-110",
            isCompact ? "w-10 h-10" : "w-12 h-12"
          )}>
            <Shield className={cn(
              "text-emerald-600",
              isCompact ? "h-5 w-5" : "h-6 w-6"
            )} />
          </div>
          <div className="flex-1">
            <p className={cn(
              "font-semibold text-emerald-800",
              isCompact ? "text-sm" : "text-base"
            )}>
              30-Day Money-Back Guarantee
            </p>
            {!isMinimal && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Not satisfied? Get a full refund, no questions asked.
              </p>
            )}
          </div>
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        </div>
      )}

      {/* Powered by Square Badge */}
      {showSquareBadge && (
        <div className={cn(
          "flex items-center justify-center gap-2 py-3 px-4 rounded-lg",
          "bg-white border border-gray-200 shadow-sm",
          "transition-all duration-300 hover:shadow-md hover:border-blue-200",
          isMinimal && "py-2 px-3"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#006AFF] flex items-center justify-center">
              <span className="text-white text-xs font-bold">□</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Secure payments by</span>
              <span className="text-sm font-semibold text-gray-800">Square</span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Lock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">PCI Compliant</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PaymentSecurityBadge({ className }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
      "bg-green-50 border border-green-200 text-green-700",
      "transition-all duration-200 hover:bg-green-100",
      className
    )}>
      <Lock className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">Secure Payment</span>
      <CheckCircle className="h-3.5 w-3.5" />
    </div>
  );
}

export function SquarePoweredBadge({ className }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
      "bg-white border border-gray-200 shadow-sm",
      "transition-all duration-200 hover:shadow-md",
      className
    )}>
      <div className="w-5 h-5 rounded bg-[#006AFF] flex items-center justify-center">
        <span className="text-white text-[10px] font-bold">□</span>
      </div>
      <span className="text-xs font-medium text-gray-600">Powered by Square</span>
    </div>
  );
}
