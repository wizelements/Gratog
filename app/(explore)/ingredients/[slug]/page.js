'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles, ShoppingCart, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getIngredientBySlug } from '@/lib/ingredient-data-extended';

export default function IngredientDetailPage() {
  const params = useParams();
  const [ingredient, setIngredient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.slug) {
      const found = getIngredientBySlug(params.slug);
      setIngredient(found);
      setLoading(false);
    }
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🌿</div>
          <p className="text-white text-xl">Loading ingredient...</p>
        </div>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-3xl font-bold text-white mb-4">Ingredient not found</h2>
          <Link href="/explore/ingredients">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ingredients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const rarityColors = {
    common: 'bg-gray-500',
    rare: 'bg-blue-500',
    legendary: 'bg-amber-500'
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Back Button */}
        <Link href="/explore/ingredients">
          <Button variant="ghost" className="text-white hover:bg-white/10 mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Explorer
          </Button>
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="text-8xl mb-6 animate-bounce-gentle">{ingredient.icon}</div>
          <h1 className="text-5xl font-bold text-white mb-4">{ingredient.name}</h1>
          {ingredient.scientificName && (
            <p className="text-xl text-emerald-300 italic mb-4">{ingredient.scientificName}</p>
          )}
          <p className="text-xl text-white/80 mb-6 max-w-2xl mx-auto">
            {ingredient.longDescription || ingredient.description}
          </p>
          <div className="flex gap-3 justify-center">
            {ingredient.rarity && (
              <Badge className={`${rarityColors[ingredient.rarity]} text-white px-4 py-2 text-sm`}>
                {ingredient.rarity === 'legendary' && <Sparkles className="h-4 w-4 mr-1" />}
                {ingredient.rarity.toUpperCase()}
              </Badge>
            )}
            {ingredient.origin && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-300 px-4 py-2 text-sm">
                Origin: {ingredient.origin}
              </Badge>
            )}
          </div>
        </div>

        {/* Benefits Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-emerald-400" />
            Wellness Benefits
          </h2>
          <div className="space-y-4">
            {ingredient.benefits?.map((benefit, index) => (
              <Card 
                key={index}
                className="bg-black/40 border-emerald-500/30 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white capitalize mb-2">{benefit}</h3>
                    <p className="text-white/60">Supports your wellness journey naturally</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Story Section */}
        {ingredient.story && ingredient.story.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">📖 The Story</h2>
            <div className="space-y-8">
              {ingredient.story.map((chapter, index) => (
                <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <h3 className="text-2xl font-bold text-emerald-400 mb-3">{chapter.title}</h3>
                  <p className="text-white/80 text-lg leading-relaxed">{chapter.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Science Facts */}
        {ingredient.facts && ingredient.facts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">🔬 Science & Facts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ingredient.facts.map((fact, index) => (
                <Card 
                  key={index}
                  className="bg-black/40 border-blue-500/30 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <p className="text-white/80">{fact}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* CTAs */}
        <section className="mt-12 pt-12 border-t border-white/10">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalog">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 w-full sm:w-auto">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Find Products
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: ingredient.name,
                    text: ingredient.description,
                    url: window.location.href
                  });
                }
              }}
            >
              <Share2 className="mr-2 h-5 w-5" />
              Share
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
