'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, Package } from 'lucide-react';

/**
 * SoldOutBadge — prominent overlay for sold-out products.
 * Renders as a centered ribbon across the product image.
 * 
 * @param {number|null} stock - Actual inventory count
 * @param {'overlay'|'inline'} variant - Display mode
 */
export default function SoldOutBadge({ stock, variant = 'overlay' }) {
  if (stock === null || stock === undefined || stock > 0) return null;

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative bg-white/95 backdrop-blur-sm shadow-lg px-6 py-2.5 rounded-full border border-gray-200">
          <span className="font-bold text-gray-800 text-sm tracking-wide uppercase flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-600" />
            Sold Out
          </span>
        </div>
      </div>
    );
  }

  // inline variant for content areas
  return (
    <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
      <Package className="h-3 w-3 mr-1" />
      Sold Out
    </Badge>
  );
}

/**
 * PreorderNotice — shown below price when item is sold out.
 * Communicates that pre-orders are available with optional minimum.
 */
export function PreorderNotice({ stock, minimumSize = '1 Gallon' }) {
  if (stock === null || stock === undefined || stock > 0) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-3 mb-3">
      <div className="flex items-start gap-2">
        <Clock className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Available for Pre-Order</p>
          {minimumSize && (
            <p className="text-xs text-emerald-600 mt-0.5">
              {minimumSize} minimum • Ships with next batch
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
