'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import IngredientExplorer from '@/components/explore/interactive/IngredientExplorer';
import { getAllExtendedIngredients } from '@/lib/ingredient-data-extended';

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Load ingredients
      const allIngredients = getAllExtendedIngredients();
      const ingredientArray = Object.values(allIngredients);
      debug('Loaded ingredients:', ingredientArray.length);
      setIngredients(ingredientArray);
      setLoading(false);
    } catch (err) {
      console.error('Error loading ingredients:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🌿</div>
          <p className="text-white text-xl">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Ingredients</h2>
          <p className="text-white/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4 animate-bounce-gentle">🌿</div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Ingredient Explorer
          </h1>
          <p className="text-xl text-emerald-300 mb-8 max-w-2xl mx-auto">
            Discover {ingredients.length} powerful ingredients and their wellness benefits
          </p>
          <div className="flex items-center justify-center gap-2 text-white/60">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <span>Click any ingredient to learn more</span>
          </div>
        </div>

        {/* Explorer */}
        <IngredientExplorer ingredients={ingredients} />
      </div>
    </div>
  );
}
