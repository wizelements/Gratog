'use client';

import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

/**
 * ScarcityBadge - Displays actual inventory status
 * 
 * IMPORTANT: This component should ONLY display real inventory data.
 * Never use random numbers or manufactured scarcity.
 * 
 * @param {number|null} stock - Actual inventory count from backend/Square
 * @param {string} productId - Product identifier for inventory lookup
 */
export default function ScarcityBadge({ productId, stock = null }) {
  // Only show badge if we have actual inventory data
  // Do not manufacture fake scarcity - this builds customer trust
  if (stock === null || stock === undefined) {
    return null;
  }

  // Only show for genuinely low stock (5 or fewer)
  if (stock > 5) {
    return null;
  }

  // Out of stock — show as available for preorder
  if (stock <= 0) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <Package className="h-3 w-3 mr-1" />
        Available for Preorder
      </Badge>
    );
  }

  // Low stock (1-5 items) - professional messaging without FOMO tactics
  return (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
      <Package className="h-3 w-3 mr-1" />
      {stock} in stock
    </Badge>
  );
}
