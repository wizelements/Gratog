'use client';

import { useState } from 'react';
import { Plus, X, Sparkles, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import audioManager from '@/lib/explore/audio-manager';
import gameEngine from '@/lib/explore/game-engine';

export default function BlendMaker({ ingredients = [] }) {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [isBlending, setIsBlending] = useState(false);
  const [blendResult, setBlendResult] = useState(null);
  const [score, setScore] = useState(0);

  const maxIngredients = 5;

  const addIngredient = (ingredient) => {
    if (selectedIngredients.length >= maxIngredients) return;
    if (selectedIngredients.find(i => i.name === ingredient.name)) return;
    
    audioManager.play('ui-tap');
    setSelectedIngredients([...selectedIngredients, ingredient]);
  };

  const removeIngredient = (ingredient) => {
    audioManager.play('ui-tap');
    setSelectedIngredients(selectedIngredients.filter(i => i.name !== ingredient.name));
  };

  const calculateSynergy = () => {
    // Calculate synergy based on complementary benefits
    const allBenefits = new Set();
    const benefitCounts = {};
    
    selectedIngredients.forEach(ing => {
      ing.benefits?.forEach(benefit => {
        allBenefits.add(benefit);
        benefitCounts[benefit] = (benefitCounts[benefit] || 0) + 1;
      });
    });

    // Synergy bonus for repeated benefits
    const synergyBonus = Object.values(benefitCounts).reduce((sum, count) => {
      return sum + (count > 1 ? (count - 1) * 10 : 0);
    }, 0);

    return Math.min(100, synergyBonus + allBenefits.size * 5);
  };

  const blendIngredients = async () => {
    if (selectedIngredients.length < 2) return;

    setIsBlending(true);
    audioManager.play('blend-mix');

    // Simulate blending animation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const synergy = calculateSynergy();
    const points = selectedIngredients.length * 10 + synergy;
    
    setScore(score + points);
    setBlendResult({
      synergy,
      points,
      benefits: getAllBenefits()
    });
    
    setIsBlending(false);
    audioManager.play('ui-success');
  };

  const getAllBenefits = () => {
    const benefits = new Set();
    selectedIngredients.forEach(ing => {
      ing.benefits?.forEach(b => benefits.add(b));
    });
    return Array.from(benefits);
  };

  const reset = () => {
    setSelectedIngredients([]);
    setBlendResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="text-center">
        <div className="text-sm text-white/60 mb-1">Total Score</div>
        <div className="text-4xl font-bold text-emerald-400">{score}</div>
      </div>

      {/* Blender Area */}
      <Card className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border-emerald-500/30">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🥤</div>
            <h3 className="text-2xl font-bold text-white mb-2">Your Blend</h3>
            <p className="text-white/60 text-sm">
              {selectedIngredients.length}/{maxIngredients} ingredients
            </p>
          </div>

          {/* Selected Ingredients */}
          <div className="min-h-[120px] flex flex-wrap gap-3 justify-center mb-6">
            {selectedIngredients.length === 0 ? (
              <div className="text-white/40 flex items-center justify-center h-[120px]">
                Click ingredients below to add them
              </div>
            ) : (
              selectedIngredients.map((ing, index) => (
                <div
                  key={index}
                  className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 flex items-center gap-2 animate-scale-in"
                >
                  <span className="text-2xl">{ing.icon}</span>
                  <span className="text-white font-medium">{ing.name}</span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing)}
                    className="ml-2 text-white/60 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Blend Button */}
          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              onClick={blendIngredients}
              disabled={selectedIngredients.length < 2 || isBlending}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
            >
              {isBlending ? (
                <>
                  <RotateCw className="mr-2 h-5 w-5 animate-spin" />
                  Blending...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Blend It!
                </>
              )}
            </Button>
            {selectedIngredients.length > 0 && (
              <Button
                size="lg"
                variant="outline"
                onClick={reset}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blend Result */}
      {blendResult && (
        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/30 animate-scale-in">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎆</div>
              <h3 className="text-2xl font-bold text-white mb-2">Blend Complete!</h3>
              <div className="text-3xl font-bold text-amber-400">+{blendResult.points} points</div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-white/80 mb-2">
                  <span>Synergy</span>
                  <span>{blendResult.synergy}%</span>
                </div>
                <Progress value={blendResult.synergy} className="h-2" />
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Combined Benefits:</h4>
                <div className="flex flex-wrap gap-2">
                  {blendResult.benefits.map((benefit, index) => (
                    <span
                      key={index}
                      className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm capitalize"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredient Palette */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-emerald-400" />
          Available Ingredients
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {ingredients.slice(0, 24).map((ingredient, index) => (
            <button
              key={index}
              onClick={() => addIngredient(ingredient)}
              disabled={selectedIngredients.find(i => i.name === ingredient.name) || selectedIngredients.length >= maxIngredients}
              className={
                `bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg p-3 transition-all hover:scale-105 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed ${
                  selectedIngredients.find(i => i.name === ingredient.name) ? 'ring-2 ring-emerald-500' : ''
                }`
              }
            >
              <div className="text-3xl mb-1">{ingredient.icon}</div>
              <div className="text-xs text-white/80 truncate">{ingredient.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
