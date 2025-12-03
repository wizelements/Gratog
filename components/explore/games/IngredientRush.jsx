'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Heart, Zap } from 'lucide-react';
import gameEngine from '@/lib/explore/game-engine';
import audioManager from '@/lib/explore/audio-manager';

const GAME_ID = 'ingredient-rush';
const GAME_DURATION = 60;
const INITIAL_SPAWN_RATE = 1000;
const MIN_SPAWN_RATE = 400;
const GRID_SIZE = 12;

const BENEFITS = ['immunity', 'thyroid', 'energy', 'digestion'];

const INGREDIENTS = [
  { id: 1, name: '🌊', label: 'Sea Moss', benefit: 'thyroid' },
  { id: 2, name: '🫐', label: 'Elderberry', benefit: 'immunity' },
  { id: 3, name: '🫚', label: 'Ginger', benefit: 'digestion' },
  { id: 4, name: '🌟', label: 'Turmeric', benefit: 'energy' },
  { id: 5, name: '🍃', label: 'Bladderwrack', benefit: 'thyroid' },
  { id: 6, name: '🌼', label: 'Echinacea', benefit: 'immunity' },
  { id: 7, name: '🍵', label: 'Peppermint', benefit: 'digestion' },
  { id: 8, name: '⚡', label: 'Ashwagandha', benefit: 'energy' }
];

export default function IngredientRush() {
  const [gameState, setGameState] = useState('start');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [targetBenefit, setTargetBenefit] = useState(BENEFITS[0]);
  const [activeIngredients, setActiveIngredients] = useState([]);
  const [spawnRate, setSpawnRate] = useState(INITIAL_SPAWN_RATE);
  const [hits, setHits] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);

  const finishGame = useCallback(() => {
    const accuracy = totalTaps > 0 ? (hits / totalTaps) : 0;
    const accuracyBonus = Math.floor(accuracy * 100 * 0.2);
    const speedBonus = Math.floor((60 - timeLeft) * 2);
    const finalScore = score + accuracyBonus + speedBonus;
    
    gameEngine.endGame(GAME_ID, finalScore);
    sessionStorage.removeItem('activeGame');
    setGameState('finished');
    
    audioManager.playSound('game-complete');
  }, [totalTaps, hits, timeLeft, score]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && lives > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      
      // Increase difficulty every 10 seconds
      if (timeLeft % 10 === 0 && spawnRate > MIN_SPAWN_RATE) {
        setSpawnRate(Math.max(MIN_SPAWN_RATE, spawnRate - 100));
      }
      
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && (timeLeft === 0 || lives === 0)) {
      finishGame();
    }
  }, [gameState, timeLeft, lives, spawnRate, finishGame]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnIngredient = () => {
      setActiveIngredients(prev => {
        if (prev.length >= 8) return prev;

        const randomIngredient = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
        const randomPosition = Math.floor(Math.random() * GRID_SIZE);
        
        const newIngredient = {
          ...randomIngredient,
          uniqueId: Date.now() + Math.random(),
          position: randomPosition
        };

        // Auto-remove after 3 seconds
        setTimeout(() => {
          setActiveIngredients(current => current.filter(i => i.uniqueId !== newIngredient.uniqueId));
        }, 3000);

        return [...prev, newIngredient];
      });
    };

    const interval = setInterval(spawnIngredient, spawnRate);
    return () => clearInterval(interval);
  }, [gameState, spawnRate]);

  const startGame = () => {
    gameEngine.startGame(GAME_ID);
    sessionStorage.setItem('activeGame', GAME_ID);
    
    const randomBenefit = BENEFITS[Math.floor(Math.random() * BENEFITS.length)];
    setTargetBenefit(randomBenefit);
    setScore(0);
    setLives(3);
    setHits(0);
    setTotalTaps(0);
    setTimeLeft(GAME_DURATION);
    setSpawnRate(INITIAL_SPAWN_RATE);
    setActiveIngredients([]);
    setGameState('playing');
    
    audioManager.playSound('ui-success');
  };

  const handleTap = (ingredient) => {
    setTotalTaps(totalTaps + 1);
    
    if (ingredient.benefit === targetBenefit) {
      setScore(score + 5);
      setHits(hits + 1);
      setActiveIngredients(prev => prev.filter(i => i.uniqueId !== ingredient.uniqueId));
      audioManager.playSound('ui-success');
    } else {
      setScore(Math.max(0, score - 3));
      setLives(lives - 1);
      audioManager.playSound('ui-error');
    }
  };

  if (gameState === 'start') {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center flex items-center justify-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            Ingredient Rush
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="prose prose-lg mx-auto">
            <p>Tap only ingredients matching the target benefit!</p>
            <ul className="text-left space-y-2">
              <li>Correct tap: <strong>+5 points</strong></li>
              <li>Wrong tap: <strong>-3 points & lose 1 life</strong></li>
              <li>Accuracy bonus: <strong>Up to +20 points</strong></li>
              <li>Speed bonus: <strong>+2 points per second</strong></li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Timer className="w-5 h-5 mr-2" />
              60 seconds
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Heart className="w-5 h-5 mr-2 text-red-500" />
              3 lives
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Trophy className="w-5 h-5 mr-2" />
              High Score: {gameEngine.getHighScore(GAME_ID) || 0}
            </Badge>
          </div>

          <Button 
            size="lg" 
            onClick={startGame}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-xl px-12 py-6"
          >
            Start Game
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'finished') {
    const highScore = gameEngine.getHighScore(GAME_ID);
    const isNewRecord = score >= highScore;
    const accuracy = totalTaps > 0 ? Math.floor((hits / totalTaps) * 100) : 0;

    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center">
            {isNewRecord ? '🎉 New High Score!' : 'Game Over!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="text-6xl font-bold text-yellow-600">{score}</div>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div>
              <p className="text-sm text-gray-600">High Score</p>
              <p className="text-2xl font-bold">{highScore}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Accuracy</p>
              <p className="text-2xl font-bold">{accuracy}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Hits</p>
              <p className="text-2xl font-bold">{hits}/{totalTaps}</p>
            </div>
          </div>
          
          <Button 
            size="lg" 
            onClick={startGame}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-xl px-12 py-6"
          >
            Play Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const accuracy = totalTaps > 0 ? Math.floor((hits / totalTaps) * 100) : 0;

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="default" className="text-xl px-4 py-2">
              <Timer className="w-5 h-5 mr-2" />
              {timeLeft}s
            </Badge>
            <Badge variant="secondary" className="text-xl px-4 py-2">
              Score: {score}
            </Badge>
            <Badge variant="outline" className="text-xl px-4 py-2">
              Accuracy: {accuracy}%
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-8 h-8 ${
                  i < lives ? 'fill-red-500 text-red-500' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Benefit */}
        <div className="text-center p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">Tap ingredients for:</p>
          <p className="text-4xl font-bold text-orange-700 capitalize">{targetBenefit}</p>
        </div>

        {/* Ingredient Grid */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 rounded-xl min-h-[400px]">
          {[...Array(GRID_SIZE)].map((_, index) => {
            const ingredient = activeIngredients.find(i => i.position === index);
            
            return (
              <div
                key={index}
                className="relative aspect-square flex items-center justify-center"
              >
                {ingredient && (
                  <button
                    onClick={() => handleTap(ingredient)}
                    className={`w-full h-full flex items-center justify-center text-6xl rounded-xl transition-all hover:scale-110 active:scale-95 ${
                      ingredient.benefit === targetBenefit
                        ? 'bg-green-200 hover:bg-green-300 animate-pulse'
                        : 'bg-red-200 hover:bg-red-300'
                    }`}
                  >
                    {ingredient.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
