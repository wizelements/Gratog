'use client';

import { useState, useEffect } from 'react';
import IngredientQuiz from '@/components/explore/games/IngredientQuiz';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAllExtendedIngredients } from '@/lib/ingredient-data-extended';

export default function IngredientQuizPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const allIngredients = getAllExtendedIngredients();
      const ingredientArray = Object.values(allIngredients).map(ing => ({
        ...ing,
        icon: ing.icon || '🌿'
      }));
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
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Quiz</h2>
          <p className="text-white/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-slate-900 to-black py-8">
      <div className="container mx-auto px-4">
        <Link href="/explore/games">
          <Button variant="ghost" className="mb-8 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Ingredient Quiz</h1>
          <p className="text-purple-300">Test your knowledge of wellness ingredients</p>
        </div>

        <IngredientQuiz ingredients={ingredients} />
      </div>
    </div>
  );
}
