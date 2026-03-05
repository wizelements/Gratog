'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HEALTH_BENEFIT_FILTERS } from '@/lib/health-benefits';
import { Sparkles, ChevronDown } from 'lucide-react';

const INITIAL_VISIBLE = 5;

const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  red: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200',
};

const SELECTED_COLOR_CLASSES = {
  blue: 'bg-blue-600 text-white border-blue-600',
  green: 'bg-green-600 text-white border-green-600',
  yellow: 'bg-yellow-500 text-white border-yellow-500',
  cyan: 'bg-cyan-600 text-white border-cyan-600',
  orange: 'bg-orange-600 text-white border-orange-600',
  pink: 'bg-pink-600 text-white border-pink-600',
  purple: 'bg-purple-600 text-white border-purple-600',
  red: 'bg-red-600 text-white border-red-600',
  teal: 'bg-teal-600 text-white border-teal-600',
  sky: 'bg-sky-600 text-white border-sky-600',
};

export default function HealthBenefitFilters({ 
  benefitCounts = [], 
  selectedBenefit = 'all',
  onBenefitChange
}) {
  const [showMore, setShowMore] = useState(false);

  const hasMore = benefitCounts.length > INITIAL_VISIBLE;
  const visibleBenefits = showMore ? benefitCounts : benefitCounts.slice(0, INITIAL_VISIBLE);
  const hiddenCount = benefitCounts.length - INITIAL_VISIBLE;

  // If the selected benefit is hidden, always show it
  const selectedIsHidden = !showMore && benefitCounts.findIndex(b => b.id === selectedBenefit) >= INITIAL_VISIBLE;
  const displayBenefits = selectedIsHidden
    ? [...visibleBenefits, benefitCounts.find(b => b.id === selectedBenefit)]
    : visibleBenefits;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          🎯 Filter by Wellness Goal
        </h3>
        <p className="text-sm text-gray-500">
          Discover products that support your health journey
        </p>
      </div>
      
      {/* Filter Buttons */}
      <div 
        className="flex flex-wrap gap-2 justify-center"
        role="radiogroup"
        aria-label="Filter by wellness goal"
      >
        {/* All Products Button */}
        <Button
          role="radio"
          aria-checked={selectedBenefit === 'all'}
          variant="outline"
          size="sm"
          onClick={() => onBenefitChange?.('all')}
          className={`
            transition-all duration-200 rounded-full px-4
            ${selectedBenefit === 'all' 
              ? 'bg-emerald-600 text-white border-emerald-600' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }
          `}
        >
          <Sparkles className="h-4 w-4 mr-1.5" aria-hidden="true" />
          All Products
        </Button>
        
        {/* Health Benefit Buttons - sorted by count (most popular first) */}
        {displayBenefits.map((benefit) => {
          const isSelected = selectedBenefit === benefit.id;
          const baseColor = benefit.color || 'blue';
          
          return (
            <Button
              key={benefit.id}
              role="radio"
              aria-checked={isSelected}
              variant="outline"
              size="sm"
              onClick={() => onBenefitChange?.(benefit.id)}
              className={`
                transition-all duration-200 rounded-full px-4 relative
                ${isSelected 
                  ? SELECTED_COLOR_CLASSES[baseColor] 
                  : COLOR_CLASSES[baseColor]
                }
              `}
            >
              <span className="mr-1.5" aria-hidden="true">{benefit.icon}</span>
              {benefit.label}
            </Button>
          );
        })}
      </div>

      {/* Show More / Show Less toggle */}
      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Show fewer goals' : `Show ${hiddenCount} more wellness goals`}
          </button>
        </div>
      )}
      
      {/* Selected Benefit Description */}
      {selectedBenefit !== 'all' && HEALTH_BENEFIT_FILTERS[selectedBenefit] && (
        <div className="text-center mt-4 p-3 bg-gray-50 rounded-lg" aria-live="polite">
          <p className="text-sm text-gray-600">
            <span aria-hidden="true">{HEALTH_BENEFIT_FILTERS[selectedBenefit].icon}</span>
            {' '}
            {HEALTH_BENEFIT_FILTERS[selectedBenefit].description}
          </p>
        </div>
      )}
    </div>
  );
}
