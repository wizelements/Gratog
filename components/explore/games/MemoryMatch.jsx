'use client';

import { useState, useEffect } from 'react';
import { RotateCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import audioManager from '@/lib/explore/audio-manager';
import gameEngine from '@/lib/explore/game-engine';

export default function MemoryMatch({ ingredients = [] }) {
  const [gameState, setGameState] = useState('start');
  const [difficulty, setDifficulty] = useState('medium');
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);

  const difficulties = {
    easy: { pairs: 4, grid: 'grid-cols-4' },
    medium: { pairs: 8, grid: 'grid-cols-4' },
    hard: { pairs: 12, grid: 'grid-cols-6' }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => setTime(t => t + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      setMoves(moves + 1);

      if (cards[first].id === cards[second].id) {
        // Match!
        audioManager.play('ui-success');
        setMatchedCards([...matchedCards, first, second]);
        setFlippedCards([]);
        
        // Check if game is won
        if (matchedCards.length + 2 === cards.length) {
          setTimeout(() => finishGame(), 500);
        }
      } else {
        // No match
        audioManager.play('ui-error');
        setTimeout(() => setFlippedCards([]), 1000);
      }
    }
  }, [flippedCards]);

  const startGame = () => {
    gameEngine.startGame('memory-match');
    
    const pairCount = difficulties[difficulty].pairs;
    const selectedIngredients = ingredients
      .sort(() => Math.random() - 0.5)
      .slice(0, pairCount);

    // Create pairs
    const cardPairs = selectedIngredients.flatMap((ing, index) => [
      { id: index, ingredient: ing },
      { id: index, ingredient: ing }
    ]);

    // Shuffle
    setCards(cardPairs.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setTime(0);
    setGameState('playing');
  };

  const finishGame = () => {
    const baseScore = difficulties[difficulty].pairs * 100;
    const moveBonus = Math.max(0, 100 - moves * 2);
    const timeBonus = Math.max(0, 100 - time);
    const totalScore = baseScore + moveBonus + timeBonus;

    gameEngine.endGame('memory-match', totalScore);
    setGameState('finished');
  };

  const flipCard = (index) => {
    if (flippedCards.length >= 2) return;
    if (flippedCards.includes(index)) return;
    if (matchedCards.includes(index)) return;

    audioManager.play('ui-tap');
    setFlippedCards([...flippedCards, index]);
  };

  if (gameState === 'start') {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🎴</div>
        <h2 className="text-3xl font-bold text-white mb-4">Memory Match</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          Match pairs of ingredients to win!
          <br />
          Test your memory and speed.
        </p>

        <div className="mb-8">
          <h3 className="text-white mb-4">Select Difficulty:</h3>
          <div className="flex gap-4 justify-center">
            {Object.keys(difficulties).map(diff => (
              <Button
                key={diff}
                variant={difficulty === diff ? 'default' : 'outline'}
                onClick={() => setDifficulty(diff)}
                className={difficulty === diff ? '' : 'border-white/20 text-white hover:bg-white/10'}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
                <br />
                <span className="text-xs">({difficulties[diff].pairs} pairs)</span>
              </Button>
            ))}
          </div>
        </div>

        <Button size="lg" onClick={startGame} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
          Start Game
        </Button>
      </div>
    );
  }

  if (gameState === 'finished') {
    const stars = moves <= difficulties[difficulty].pairs * 3 ? 3 : moves <= difficulties[difficulty].pairs * 5 ? 2 : 1;
    return (
      <div className="text-center py-12 animate-scale-in">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-3xl font-bold text-white mb-4">You Won!</h2>
        <div className="flex justify-center gap-2 text-5xl mb-6">
          {Array.from({ length: stars }).map((_, i) => (
            <span key={i}>⭐</span>
          ))}
        </div>
        <div className="space-y-2 mb-8 text-white/80">
          <div>Moves: <span className="font-bold text-white">{moves}</span></div>
          <div>Time: <span className="font-bold text-white">{time}s</span></div>
        </div>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={startGame} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
            Play Again
          </Button>
          <Button size="lg" variant="outline" onClick={() => setGameState('start')} className="border-white/20 text-white hover:bg-white/10">
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex justify-between items-center">
        <div className="text-white">
          <span className="text-white/60">Moves:</span>
          <span className="text-2xl font-bold ml-2">{moves}</span>
        </div>
        <div className="text-white">
          <span className="text-white/60">Time:</span>
          <span className="text-2xl font-bold ml-2">{time}s</span>
        </div>
        <div className="text-white">
          <span className="text-white/60">Matched:</span>
          <span className="text-2xl font-bold ml-2">{matchedCards.length / 2}/{cards.length / 2}</span>
        </div>
      </div>

      {/* Card Grid */}
      <div className={`grid ${difficulties[difficulty].grid} gap-4 max-w-4xl mx-auto`}>
        {cards.map((card, index) => {
          const isFlipped = flippedCards.includes(index) || matchedCards.includes(index);
          return (
            <button
              type="button"
              key={index}
              onClick={() => flipCard(index)}
              disabled={isFlipped}
              className="aspect-square relative transform transition-transform hover:scale-105 disabled:cursor-not-allowed"
            >
              <div className={`w-full h-full absolute inset-0 rounded-lg transition-all duration-500 ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}>
                {/* Back of card */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center border-2 border-white/20 [backface-visibility:hidden]">
                  <div className="text-4xl">❓</div>
                </div>
                
                {/* Front of card */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 to-green-600/40 rounded-lg flex flex-col items-center justify-center border-2 border-emerald-500/50 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="text-5xl mb-2">{card.ingredient.icon}</div>
                  <div className="text-white text-sm font-semibold px-2 text-center">{card.ingredient.name}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
