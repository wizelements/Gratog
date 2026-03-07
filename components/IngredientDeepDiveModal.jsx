'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Heart, Leaf, Zap, Sun, Droplets } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Ingredient Deep Dive Modal
 * Shows detailed ingredient information, benefits, sourcing, and flavor notes
 */

const INGREDIENT_DATABASE = {
  'sea moss': {
    icon: '🌊',
    name: 'Wildcrafted Sea Moss',
    color: 'emerald',
    benefits: [
      'Contains 92 of 102 essential minerals',
      'Supports immune system health',
      'Promotes digestive wellness',
      'Natural thyroid support'
    ],
    story: 'Harvested from pristine Caribbean waters, our sea moss is sun-dried and prepared using traditional methods passed down through generations. Each batch is carefully inspected to ensure premium quality and potency.',
    flavorProfile: 'Mild ocean essence with subtle mineral notes',
    sourcing: 'Sustainably wildcrafted from St. Lucia',
    nutritionalHighlights: [
      { nutrient: 'Iodine', benefit: 'Thyroid function' },
      { nutrient: 'Potassium', benefit: 'Heart health' },
      { nutrient: 'Calcium', benefit: 'Bone strength' },
      { nutrient: 'Magnesium', benefit: 'Muscle recovery' }
    ]
  },
  'ginger': {
    icon: '🫚',
    name: 'Fresh Ginger Root',
    color: 'orange',
    benefits: [
      'Natural anti-inflammatory properties',
      'Aids digestion and reduces nausea',
      'Supports circulation',
      'Warming and energizing'
    ],
    story: 'Our ginger is sourced from organic farms known for their rich, spicy roots. Fresh-pressed daily to capture maximum flavor and beneficial compounds.',
    flavorProfile: 'Spicy, warming with citrus undertones',
    sourcing: 'Certified organic farms',
    nutritionalHighlights: [
      { nutrient: 'Gingerol', benefit: 'Anti-inflammatory' },
      { nutrient: 'Vitamin C', benefit: 'Immune support' }
    ]
  },
  'lemon': {
    icon: '🍋',
    name: 'Fresh-Squeezed Lemon',
    color: 'yellow',
    benefits: [
      'Rich in Vitamin C',
      'Alkalizing effect on body',
      'Supports liver detoxification',
      'Natural energizer'
    ],
    story: 'Hand-picked lemons from sun-soaked groves, cold-pressed to preserve their vital nutrients and bright, uplifting flavor.',
    flavorProfile: 'Bright citrus with natural tartness',
    sourcing: 'Local organic citrus farms',
    nutritionalHighlights: [
      { nutrient: 'Vitamin C', benefit: 'Antioxidant power' },
      { nutrient: 'Citric acid', benefit: 'Alkalizing' }
    ]
  },
  'elderberry': {
    icon: '🫐',
    name: 'Organic Elderberry',
    color: 'purple',
    benefits: [
      'Powerful immune system booster',
      'Rich in antioxidants',
      'Supports respiratory health',
      'Natural cold & flu fighter'
    ],
    story: 'European elderberries have been used for centuries as a natural remedy. Our organic elderberry extract is concentrated for maximum potency.',
    flavorProfile: 'Deep berry with subtle tartness',
    sourcing: 'European organic elderberry farms',
    nutritionalHighlights: [
      { nutrient: 'Anthocyanins', benefit: 'Immune defense' },
      { nutrient: 'Vitamin A', benefit: 'Cellular health' }
    ]
  },
  'pineapple': {
    icon: '🍍',
    name: 'Fresh Pineapple',
    color: 'yellow',
    benefits: [
      'Contains bromelain enzyme',
      'Supports digestion',
      'Anti-inflammatory properties',
      'Rich in Vitamin C'
    ],
    story: 'Tropical sweetness meets powerful enzymes. Our pineapples are selected at peak ripeness for optimal flavor and nutritional content.',
    flavorProfile: 'Sweet tropical with tangy finish',
    sourcing: 'Sustainable tropical farms',
    nutritionalHighlights: [
      { nutrient: 'Bromelain', benefit: 'Digestive enzyme' },
      { nutrient: 'Manganese', benefit: 'Bone health' }
    ]
  },
  'apple': {
    icon: '🍎',
    name: 'Organic Apple',
    color: 'red',
    benefits: [
      'Rich in fiber and antioxidants',
      'Supports heart health',
      'Natural sweetness',
      'Sustained energy'
    ],
    story: 'Crisp, juicy apples from organic orchards provide natural sweetness and beneficial polyphenols.',
    flavorProfile: 'Crisp, sweet with subtle tartness',
    sourcing: 'Certified organic orchards',
    nutritionalHighlights: [
      { nutrient: 'Quercetin', benefit: 'Antioxidant' },
      { nutrient: 'Pectin', benefit: 'Gut health' }
    ]
  },
  'blue lotus': {
    icon: '🪷',
    name: 'Sacred Blue Lotus',
    color: 'blue',
    benefits: [
      'Promotes calm and relaxation',
      'Traditional mood enhancer',
      'Supports focus and clarity',
      'Ancient wellness herb'
    ],
    story: 'Revered in ancient Egyptian culture, blue lotus has been used for thousands of years for its calming and mood-enhancing properties.',
    flavorProfile: 'Floral with subtle earthy notes',
    sourcing: 'Ethically wildcrafted',
    nutritionalHighlights: [
      { nutrient: 'Aporphine', benefit: 'Relaxation' },
      { nutrient: 'Nuciferine', benefit: 'Mood support' }
    ]
  }
};

export default function IngredientDeepDiveModal({ ingredient, isOpen, onClose }) {
  const ingredientKey = ingredient?.name?.toLowerCase() || '';
  const ingredientData = INGREDIENT_DATABASE[ingredientKey] || null;

  const handleDialogOpenChange = (open) => {
    if (!open) {
      onClose();
    }
  };

  if (!ingredientData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ingredient Information</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Detailed information for {ingredient?.name || 'this ingredient'} is being prepared.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const colorMap = {
    emerald: 'from-emerald-500 to-teal-600',
    orange: 'from-orange-500 to-red-600',
    yellow: 'from-yellow-500 to-orange-600',
    purple: 'from-purple-500 to-indigo-600',
    red: 'from-red-500 to-pink-600',
    blue: 'from-blue-500 to-cyan-600'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <ScrollArea className="max-h-[80vh] pr-4">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colorMap[ingredientData.color]} flex items-center justify-center text-4xl`}>
                {ingredientData.icon}
              </div>
              <div>
                <DialogTitle className="text-2xl">{ingredientData.name}</DialogTitle>
                <Badge className="mt-2" variant="outline">{ingredientData.sourcing}</Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Story Section */}
          <Card className="mb-6 border-l-4 border-l-emerald-600">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                The Story
              </h3>
              <p className="text-muted-foreground leading-relaxed">{ingredientData.story}</p>
            </CardContent>
          </Card>

          {/* Benefits Grid */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Health Benefits
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {ingredientData.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <span className="text-sm text-emerald-900">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flavor Profile */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                Flavor Profile
              </h3>
              <p className="text-muted-foreground italic">"{ingredientData.flavorProfile}"</p>
            </CardContent>
          </Card>

          {/* Nutritional Highlights */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Nutritional Highlights
            </h3>
            <div className="space-y-2">
              {ingredientData.nutritionalHighlights.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium text-sm">{item.nutrient}</span>
                  <span className="text-sm text-muted-foreground">{item.benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
