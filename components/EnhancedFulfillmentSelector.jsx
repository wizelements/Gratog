'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  Zap,
  Leaf,
  Heart,
  Gift,
  CheckCircle2,
  Info
} from 'lucide-react';

/**
 * Enhanced Fulfillment Selector with immersive, visual experience
 * Provides engaging UI for pickup, shipping, and delivery options
 */
export default function EnhancedFulfillmentSelector({ 
  fulfillmentOptions, 
  selectedType, 
  onSelect,
  subtotal = 0,
  className = ''
}) {
  const [hoveredOption, setHoveredOption] = useState(null);

  // Enhanced option configurations with visual themes
  const optionThemes = {
    pickup_market: {
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      icon: Package,
      benefits: [
        { icon: Leaf, text: 'Zero carbon footprint' },
        { icon: Heart, text: 'Support local markets' },
        { icon: Clock, text: 'Pick up this Saturday' }
      ],
      tagline: 'Fresh from our booth to you',
      emoji: '🌱'
    },
    shipping: {
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      icon: MapPin,
      benefits: [
        { icon: Zap, text: 'Fast 2-3 day delivery' },
        { icon: Gift, text: 'Insured packaging' },
        { icon: CheckCircle2, text: 'Track your package' }
      ],
      tagline: 'Delivered right to your door',
      emoji: '📦'
    },
    delivery: {
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
      icon: Truck,
      benefits: [
        { icon: Zap, text: 'Same-day delivery' },
        { icon: Clock, text: 'Flexible time windows' },
        { icon: Heart, text: 'White-glove service' }
      ],
      tagline: 'Local delivery to your door',
      emoji: '🚚'
    }
  };


  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with context */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Fulfillment Experience
        </h2>
        <p className="text-sm text-gray-600">
          Select how you'd like to receive your sea moss wellness products
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
          const isHovered = hoveredOption === key;

          return (
            <Card
              key={key}
              className={`relative overflow-hidden transition-all duration-300 cursor-pointer group ${
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : isSelected
                    ? `ring-2 ring-offset-2 ring-${theme.gradient.split('-')[1]}-500 shadow-lg scale-105`
                    : isHovered
                      ? 'shadow-md scale-102'
                      : 'hover:shadow-md'
              }`}
              onClick={() => !isDisabled && onSelect(key)}
              onMouseEnter={() => !isDisabled && setHoveredOption(key)}
              onMouseLeave={() => setHoveredOption(null)}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} opacity-${isSelected ? '100' : '0'} group-hover:opacity-50 transition-opacity duration-300`} />
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className={`absolute top-3 right-3 bg-gradient-to-r ${theme.gradient} rounded-full p-1 shadow-lg animate-in zoom-in-50 duration-300`}>
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              )}

              {/* Disabled Badge */}
              {isDisabled && (
                <div className="absolute top-3 right-3">
                  <Badge variant="destructive" className="shadow-sm">
                    Unavailable
                  </Badge>
                </div>
              )}

              <CardContent className="relative p-6 space-y-4">
                {/* Icon and Title */}
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-md`}>
                    <IconComponent className="h-6 w-6 text-white" />
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

                {/* Price Badge */}
                {!isDisabled && (
                  <div className="flex items-center gap-2">
                    {option.fee === 0 ? (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm">
                        ✨ FREE
                      </Badge>
                    ) : typeof option.fee === 'number' ? (
                      <Badge variant="secondary" className="shadow-sm">
                        ${option.fee.toFixed(2)}
                        {key === 'shipping' && subtotal >= 50 && ' → FREE! 🎉'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shadow-sm">
                        Varies by location
                      </Badge>
                    )}
                  </div>
                )}

                {/* Benefits List */}
                {!isDisabled && theme.benefits && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {theme.benefits.map((benefit, idx) => {
                      const BenefitIcon = benefit.icon;
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 text-xs text-gray-700 animate-in fade-in slide-in-from-left-2"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <BenefitIcon className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          <span>{benefit.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tooltip for unavailable */}
                {isDisabled && (
                  <div className="flex items-start gap-2 p-3 bg-gray-100 rounded-lg">
                    <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
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
        <p>💚 All orders are packed with care and gratitude</p>
      </div>
    </div>
  );
}
