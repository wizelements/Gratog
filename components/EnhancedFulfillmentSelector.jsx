'use client';

import { Card, CardContent } from '@/components/ui/card';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle2
} from 'lucide-react';

/**
 * Enhanced Fulfillment Selector with immersive, visual experience
 * Provides engaging UI for pickup, shipping, and delivery options
 */
export default function EnhancedFulfillmentSelector({ 
  fulfillmentOptions, 
  selectedType, 
  onSelect,
  className = ''
}) {
  const optionThemes = {
    pickup_market: {
      icon: Package,
      accentClass: 'bg-emerald-100 text-emerald-700',
      selectedClass: 'border-emerald-700 bg-emerald-50',
      benefits: ['Market pickup', 'Fresh Saturday batches', 'Meet us at the booth'],
      tagline: 'Fresh from our booth to you',
      emoji: '🌱'
    },
    shipping: {
      icon: MapPin,
      accentClass: 'bg-stone-100 text-stone-700',
      selectedClass: 'border-stone-700 bg-stone-50',
      benefits: ['Shipped carefully', 'Tracking included', 'Packed for freshness'],
      tagline: 'Delivered right to your door',
      emoji: '📦'
    },
    delivery: {
      icon: Truck,
      accentClass: 'bg-amber-100 text-amber-800',
      selectedClass: 'border-amber-700 bg-amber-50',
      benefits: ['Local delivery', 'Clear delivery window', 'Packed with care'],
      tagline: 'Local delivery to your door',
      emoji: '🚚'
    }
  };


  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with context */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Fulfillment
        </h2>
        <p className="text-sm text-gray-600">
          Select how you&apos;d like to receive your order.
        </p>
      </div>

      {/* Fulfillment Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(fulfillmentOptions).map(([key, option]) => {
          const theme = optionThemes[key];
          if (!theme) return null;

          const IconComponent = theme.icon;
          const isSelected = selectedType === key;
          const isDisabled = !option.enabled;

          return (
            <Card
              key={key}
              className={`relative overflow-hidden border transition-colors duration-200 ${
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : isSelected
                    ? `${theme.selectedClass} shadow-sm`
                    : 'cursor-pointer border-gray-200 hover:border-emerald-200'
              }`}
              onClick={() => !isDisabled && onSelect(key)}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 rounded-full bg-emerald-700 p-1">
                  <CheckCircle2 className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              )}

              {/* Disabled Label */}
              {isDisabled && (
                <div className="absolute top-3 right-3">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    Unavailable
                  </span>
                </div>
              )}

              <CardContent className="relative p-6 space-y-4">
                {/* Icon and Title */}
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${theme.accentClass}`}>
                    <IconComponent className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                      {option.label}
                      <span className="text-2xl">{theme.emoji}</span>
                    </h3>
                    <p className="text-xs text-gray-600 italic">{theme.tagline}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700 leading-relaxed">
                  {option.description}
                </p>

                {/* Price */}
                {!isDisabled && (
                  <div className="flex items-center gap-2">
                    {option.fee === 0 ? (
                      <span className="text-sm font-semibold text-emerald-700">Free</span>
                    ) : typeof option.fee === 'number' ? (
                      <span className="text-sm font-semibold text-gray-800">${option.fee.toFixed(2)}</span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-700">Varies by location</span>
                    )}
                  </div>
                )}

                {/* Benefits List */}
                {!isDisabled && theme.benefits && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {theme.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-2 text-xs text-gray-700">
                        <Clock className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" aria-hidden="true" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tooltip for unavailable */}
                {isDisabled && (
                  <div className="flex items-start gap-2 p-3 bg-gray-100 rounded-lg">
                    <p className="text-xs text-gray-600">
                      This fulfillment option is temporarily unavailable. Please choose another option.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center text-xs text-gray-500 mt-4">
        <p>All orders are packed with care and gratitude.</p>
      </div>
    </div>
  );
}
