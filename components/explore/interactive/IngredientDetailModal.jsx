'use client';

import { useState } from 'react';
import { X, ExternalLink, Sparkles, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import audioManager from '@/lib/explore/audio-manager';

export default function IngredientDetailModal({ ingredient, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('benefits');

  if (!ingredient) return null;

  const handleOpen = (open) => {
    if (!open) {
      onClose();
    } else {
      // Play open sound
      audioManager.play('modal-open');
    }
  };

  const rarityColors = {
    common: 'bg-gray-500',
    rare: 'bg-blue-500',
    legendary: 'bg-amber-500'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 to-emerald-900 border-emerald-500/30 text-white">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-6xl animate-bounce-gentle">{ingredient.icon}</div>
                <div>
                  <DialogTitle className="text-3xl text-white mb-2">
                    {ingredient.name}
                  </DialogTitle>
                  {ingredient.scientificName && (
                    <p className="text-sm text-emerald-300 italic">{ingredient.scientificName}</p>
                  )}
                </div>
              </div>
              <p className="text-white/80 mb-4">{ingredient.longDescription || ingredient.description}</p>
              <div className="flex gap-2">
                {ingredient.rarity && (
                  <Badge className={`${rarityColors[ingredient.rarity]} text-white`}>
                    {ingredient.rarity === 'legendary' && <Sparkles className="h-3 w-3 mr-1" />}
                    {ingredient.rarity.toUpperCase()}
                  </Badge>
                )}
                {ingredient.origin && (
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-300">
                    Origin: {ingredient.origin}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4 bg-black/40">
            <TabsTrigger value="benefits" className="data-[state=active]:bg-emerald-600">Benefits</TabsTrigger>
            <TabsTrigger value="story" className="data-[state=active]:bg-emerald-600">Story</TabsTrigger>
            <TabsTrigger value="science" className="data-[state=active]:bg-emerald-600">Science</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-emerald-600">Products</TabsTrigger>
          </TabsList>

          {/* Benefits Tab */}
          <TabsContent value="benefits" className="mt-6 space-y-4">
            {ingredient.benefits?.map((benefit, index) => (
              <Card 
                key={index} 
                className="bg-black/40 border-emerald-500/30 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white capitalize mb-1">
                      {benefit}
                    </h4>
                    <p className="text-white/60 text-sm">
                      Supports overall wellness and vitality
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Story Tab */}
          <TabsContent value="story" className="mt-6 space-y-6">
            {ingredient.story?.map((chapter, index) => (
              <div 
                key={index} 
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h3 className="text-2xl font-bold text-emerald-400 mb-3">{chapter.title}</h3>
                <p className="text-white/80 leading-relaxed">{chapter.content}</p>
              </div>
            ))}
          </TabsContent>

          {/* Science Tab */}
          <TabsContent value="science" className="mt-6 space-y-4">
            {ingredient.facts?.map((fact, index) => (
              <Card 
                key={index}
                className="bg-black/40 border-blue-500/30 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex-shrink-0 text-2xl">🔬</div>
                  <p className="text-white/80">{fact}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            <div className="text-center py-8">
              <ShoppingCart className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Products with {ingredient.name}
              </h3>
              <p className="text-white/60 mb-6">
                Explore our catalog to find products featuring this ingredient
              </p>
              <Link href="/catalog">
                <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
                  View Products
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>

        {/* Related Ingredients */}
        {ingredient.relatedIngredients && ingredient.relatedIngredients.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Related Ingredients</h3>
            <div className="flex gap-3 flex-wrap">
              {ingredient.relatedIngredients.map((related, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="border-emerald-500/50 text-emerald-300 cursor-pointer hover:bg-emerald-500/20"
                >
                  {related}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
