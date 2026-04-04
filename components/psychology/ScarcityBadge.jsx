'use client';

import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

/**
 * ScarcityBadge - Displays LOW STOCK warnings only (1–threshold).
 * Sold-out / preorder messaging is handled by SoldOutBadge and card-level UI.
 * 
 * IMPORTANT: This component should ONLY display real inventory data.
 * Never use random numbers or manufactured scarcity.
 * 
 * @param {number|null} stock - Actual inventory count from backend/Square
 * @param {number} threshold - Low-stock threshold (default 5)
 */
export default function ScarcityBadge({ productId, stock = null, threshold = 5 }) {
  if (stock === null || stock === undefined) return null;

  // Sold out — handled by SoldOutBadge, not here
  if (stock <= 0) return null;

  // Only show for genuinely low stock
  if (stock > threshold) return null;

  return (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
      <Package className="h-3 w-3 mr-1" />
      Only {stock} left
    </Badge>
  );
}
