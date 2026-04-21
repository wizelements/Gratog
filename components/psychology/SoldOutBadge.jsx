'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, Package } from 'lucide-react';

/**
 * SoldOutBadge — overlay for sold-out products.
 * Shows "Preorder Available" instead of "Sold Out" when stock <= 0,
 * because all out-of-stock products are preorder-eligible.
 * 
 * @param {number|null} stock - Actual inventory count
 * @param {'overlay'|'inline'} variant - Display mode
 */
export default function SoldOutBadge({ stock, variant = 'overlay' }) {
  if (stock === null || stock === undefined || stock > 0) return null;

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative bg-white/95 backdrop-blur-sm shadow-lg px-6 py-2.5 rounded-full border border-emerald-200">
          <span className="font-bold text-emerald-800 text-sm tracking-wide uppercase flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            Preorder Available
          </span>
        </div>
      </div>
    );
  }

  // inline variant for content areas
  return (
    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
      <Clock className="h-3 w-3 mr-1" />
      Preorder Available
    </Badge>
  );
}

/**
 * PreorderNotice — shown below price when item is sold out.
 * Explains how preorder works in plain language.
 */
export function PreorderNotice({ stock, minimumSize = '1 Gallon' }) {
  if (stock === null || stock === undefined || stock > 0) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-3 mb-3">
      <div className="flex items-start gap-2">
        <Clock className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Preorder — Made Fresh for You</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Order now, pick up at your next market visit. We&apos;ll prepare it fresh for your pickup date.
          </p>
          {minimumSize && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              {minimumSize} minimum
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
