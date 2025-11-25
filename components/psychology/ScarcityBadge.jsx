'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';

export default function ScarcityBadge({ productId, initialStock = null }) {
  const [stock, setStock] = useState(initialStock || Math.floor(Math.random() * 8) + 3);
  const [isLowStock, setIsLowStock] = useState(false);

  useEffect(() => {
    setIsLowStock(stock <= 5);
  }, [stock]);

  if (!stock || stock > 20) return null;

  return (
    <Badge 
      className={
        isLowStock 
          ? "bg-red-100 text-red-700 border-red-300 animate-pulse"
          : "bg-orange-100 text-orange-700 border-orange-300"
      }
    >
      <Flame className="h-3 w-3 mr-1" />
      Only {stock} left!
    </Badge>
  );
}
