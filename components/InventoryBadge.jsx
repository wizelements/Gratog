'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Flame, Clock } from 'lucide-react';

/**
 * ScarcityBadge - Shows urgency based on inventory levels
 * 
 * Props:
 * - stock: number - current inventory
 * - threshold: number - when to show urgency (default: 10)
 * - isPreorder: boolean - if product is preorder
 */
export default function InventoryBadge({ 
  stock, 
  threshold = 10, 
  isPreorder = false,
  isSellingFast = false 
}) {
  // Don't show if plenty of stock and not selling fast
  if (stock > threshold && !isSellingFast) return null;

  // Preorder state
  if (isPreorder) {
    return (
      <Badge 
        variant="outline" 
        className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse"
      >
        <Clock className="w-3 h-3 mr-1" />
        Preorder
      </Badge>
    );
  }

  // Out of stock
  if (stock <= 0) {
    return (
      <Badge 
        variant="outline" 
        className="bg-gray-100 text-gray-600 border-gray-200"
      >
        Out of Stock
      </Badge>
    );
  }

  // Low stock - critical urgency
  if (stock <= 3) {
    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Badge 
          variant="outline" 
          className="bg-red-100 text-red-700 border-red-300 font-semibold"
        >
          <Flame className="w-3 h-3 mr-1" />
          Only {stock} left!
        </Badge>
      </motion.div>
    );
  }

  // Medium urgency
  if (stock <= threshold) {
    return (
      <Badge 
        variant="outline" 
        className="bg-amber-100 text-amber-700 border-amber-200"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Only {stock} left
      </Badge>
    );
  }

  // Selling fast (but stock > threshold)
  if (isSellingFast) {
    return (
      <Badge 
        variant="outline" 
        className="bg-emerald-100 text-emerald-700 border-emerald-200"
      >
        <Flame className="w-3 h-3 mr-1" />
        Selling Fast
      </Badge>
    );
  }

  return null;
}

/**
 * SoldOutBadge - For completely out of stock items
 */
export function SoldOutBadge() {
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
      <Badge className="bg-gray-800 text-white border-none text-sm px-4 py-1">
        Sold Out
      </Badge>
    </div>
  );
}

/**
 * PreorderNotice - For preorder items
 */
export function PreorderNotice({ estimatedDate }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
      <p className="text-sm text-amber-800 flex items-center">
        <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
        <span>
          <strong>Preorder:</strong> Ships {estimatedDate || 'soon'}
        </span>
      </p>
    </div>
  );
}
