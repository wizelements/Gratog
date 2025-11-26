'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function IngredientCard({ ingredient, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  const rarityColors = {
    common: 'bg-gray-500',
    rare: 'bg-blue-500',
    legendary: 'bg-amber-500'
  };

  return (
    <Card
      className={
        `cursor-pointer transition-all duration-300 hover-lift ${
          isHovered ? 'scale-105 shadow-2xl' : ''
        } bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm`
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <CardHeader className="text-center">
        {/* Rarity Badge */}
        {ingredient.rarity && (
          <div className="flex justify-center mb-2">
            <Badge 
              className={`${rarityColors[ingredient.rarity] || rarityColors.common} text-white text-xs`}
            >
              {ingredient.rarity === 'legendary' && <Sparkles className="h-3 w-3 mr-1" />}
              {ingredient.rarity.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Emoji Icon */}
        <div 
          className={`text-6xl mb-4 transition-transform duration-300 ${
            isHovered ? 'scale-110 animate-bounce-gentle' : ''
          }`}
        >
          {ingredient.icon}
        </div>

        <CardTitle className="text-white text-xl mb-2">
          {ingredient.name}
        </CardTitle>
        
        <CardDescription className="text-white/60 text-sm">
          {ingredient.description || 'Explore this ingredient'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Benefits Preview */}
        <div className="space-y-2 mb-4">
          {ingredient.benefits?.slice(0, 2).map((benefit, index) => (
            <div key={index} className="flex items-center text-sm text-emerald-300">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></div>
              <span className="capitalize">{benefit}</span>
            </div>
          ))}
          {ingredient.benefits?.length > 2 && (
            <div className="text-sm text-white/40">
              +{ingredient.benefits.length - 2} more benefits
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-emerald-400">
            Learn More
          </span>
          <ArrowRight className={`h-4 w-4 text-emerald-400 transition-transform ${
            isHovered ? 'translate-x-1' : ''
          }`} />
        </div>
      </CardContent>
    </Card>
  );
}
