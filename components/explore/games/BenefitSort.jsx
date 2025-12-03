'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Zap, Target } from 'lucide-react';
import gameEngine from '@/lib/explore/game-engine';
import audioManager from '@/lib/explore/audio-manager';

const GAME_ID = 'benefit-sort';
const GAME_DURATION = 60;

const BENEFITS = [
  { id: 'immunity', label: 'Immunity', color: 'bg-blue-500' },
  { id: 'thyroid', label: 'Thyroid', color: 'bg-purple-500' },
  { id: 'energy', label: 'Energy', color: 'bg-yellow-500' },
  { id: 'digestion', label: 'Digestion', color: 'bg-green-500' }
];

const INGREDIENTS = [
  { id: 1, name: 'Sea Moss', benefit: 'thyroid' },
  { id: 2, name: 'Elderberry', benefit: 'immunity' },
  { id: 3, name: 'Ginger', benefit: 'digestion' },
  { id: 4, name: 'Turmeric', benefit: 'energy' },
  { id: 5, name: 'Bladderwrack', benefit: 'thyroid' },
  { id: 6, name: 'Echinacea', benefit: 'immunity' },
  { id: 7, name: 'Peppermint', benefit: 'digestion' },
  { id: 8, name: 'Ashwagandha', benefit: 'energy' }
];

export default function BenefitSort() {
  const [gameState, setGameState] = useState('start');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentItems, setCurrentItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const finishGame = useCallback(() => {
    const timeBonus = timeLeft * 1;
    const finalScore = score + timeBonus;
    
    gameEngine.endGame(GAME_ID, finalScore);
    sessionStorage.removeItem('activeGame');
    setGameState('finished');
    
    audioManager.playSound('game-complete');
  }, [timeLeft, score]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      finishGame();
    }
  }, [gameState, timeLeft, finishGame]);

  const startGame = () => {
    gameEngine.startGame(GAME_ID);
    sessionStorage.setItem('activeGame', GAME_ID);
    
    const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
    setCurrentItems(shuffled);
    setScore(0);
    setStreak(0);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
    
    audioManager.playSound('ui-success');
  };

  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  const handleDrop = (benefitId) => {
    if (!draggedItem) return;

    const isCorrect = draggedItem.benefit === benefitId;
    
    if (isCorrect) {
      const basePoints = 10;
      const streakBonus = streak * 2;
      const points = basePoints + streakBonus;
      
      setScore(score + points);
      setStreak(streak + 1);
      setFeedback({ type: 'correct', points, benefit: benefitId });
      
      setCurrentItems(currentItems.filter(i => i.id !== draggedItem.id));
      
      audioManager.playSound('ui-success');
    } else {
      const penalty = 5;
      setScore(Math.max(0, score - penalty));
      setStreak(0);
      setFeedback({ type: 'wrong', points: -penalty, benefit: benefitId });
      
      audioManager.playSound('ui-error');
    }

    setDraggedItem(null);
    setTimeout(() => setFeedback(null), 1000);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  if (gameState === 'start') {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center flex items-center justify-center gap-3">
            <Target className="w-8 h-8 text-emerald-600" />
            Benefit Sort
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="prose prose-lg mx-auto">
            <p>Drag ingredients to their matching health benefits!</p>
            <ul className="text-left space-y-2">
              <li>Correct match: <strong>+10 points</strong></li>
              <li>Wrong match: <strong>-5 points</strong></li>
              <li>Streak bonus: <strong>+2 points per streak</strong></li>
              <li>Time bonus: <strong>+1 point per second remaining</strong></li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Timer className="w-5 h-5 mr-2" />
              60 seconds
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Trophy className="w-5 h-5 mr-2" />
              High Score: {gameEngine.getHighScore(GAME_ID) || 0}
            </Badge>
          </div>

          <Button 
            size="lg" 
            onClick={startGame}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-xl px-12 py-6"
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

    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center">
            {isNewRecord ? '🎉 New High Score!' : 'Game Over!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="text-6xl font-bold text-emerald-600">{score}</div>
          <p className="text-xl text-gray-600">High Score: {highScore}</p>
          
          <Button 
            size="lg" 
            onClick={startGame}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-xl px-12 py-6"
          >
            Play Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Badge variant="default" className="text-xl px-4 py-2">
              <Timer className="w-5 h-5 mr-2" />
              {timeLeft}s
            </Badge>
            <Badge variant="secondary" className="text-xl px-4 py-2">
              Score: {score}
            </Badge>
            {streak > 0 && (
              <Badge variant="outline" className="text-xl px-4 py-2 border-yellow-500 text-yellow-600">
                <Zap className="w-5 h-5 mr-2" />
                {streak}x Streak
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Benefit Bins */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.id}
              onDrop={() => handleDrop(benefit.id)}
              onDragOver={handleDragOver}
              className={`relative ${benefit.color} bg-opacity-10 border-2 ${benefit.color.replace('bg-', 'border-')} rounded-xl p-6 min-h-[150px] flex items-center justify-center transition-all ${
                draggedItem?.benefit === benefit.id ? 'ring-4 ring-green-500 scale-105' : ''
              } ${feedback?.benefit === benefit.id ? (feedback.type === 'correct' ? 'animate-pulse ring-4 ring-green-500' : 'animate-shake ring-4 ring-red-500') : ''}`}
            >
              <span className="text-xl font-bold text-center">{benefit.label}</span>
              
              {feedback?.benefit === benefit.id && (
                <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-white font-bold ${
                  feedback.type === 'correct' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {feedback.points > 0 ? '+' : ''}{feedback.points}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ingredient Chips */}
        <div className="flex flex-wrap gap-3 justify-center p-6 bg-gray-50 rounded-xl min-h-[200px]">
          {!currentItems || currentItems.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-xl font-semibold">
                {gameState === 'playing' ? 'All ingredients sorted! 🎉' : 'Loading ingredients...'}
              </p>
            </div>
          ) : (
            currentItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item)}
                onDragEnd={() => setDraggedItem(null)}
                className="px-6 py-3 bg-white border-2 border-emerald-200 rounded-full font-semibold text-lg cursor-move hover:shadow-lg hover:scale-105 transition-all active:scale-95 select-none"
              >
                {item.name}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
