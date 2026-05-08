/**
 * 🚀 Gratog Pay Flow — Category Tabs
 * Horizontal scrollable category selector
 * Optimized for thumb navigation
 */

'use client';

import { usePayFlowUI } from '@/lib/pay-flow/store';
import { PAY_FLOW_CONSTANTS, type PayFlowCategory } from '@/lib/pay-flow/types';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  counts: Record<string, number>;
}

export function CategoryTabs({ counts }: CategoryTabsProps) {
  const { activeCategory, setActiveCategory } = usePayFlowUI();

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
      <div className="flex overflow-x-auto scrollbar-hide px-2 py-3 gap-1">
        {PAY_FLOW_CONSTANTS.CATEGORIES.map((cat) => {
          const count = counts[cat.id] || 0;
          const isActive = activeCategory === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as PayFlowCategory)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full",
                "text-sm font-medium transition-all duration-200 active:scale-95",
                "min-h-[44px]", // Touch target
                isActive 
                  ? "bg-[#1a1a1a] text-white shadow-md"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              <span className="text-base" aria-hidden="true">{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span className={cn(
                  "ml-1 text-xs px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-white/20" : "bg-gray-200 text-gray-600"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
