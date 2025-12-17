'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import audioManager from '@/lib/explore/audio-manager';
import gameEngine from '@/lib/explore/game-engine';

export default function IngredientQuiz({ ingredients = [] }) {
  const [gameState, setGameState] = useState('start'); // start, playing, finished
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const totalQuestions = 10;

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleAnswer(null);
    }
  }, [timeLeft, gameState, showResult]);

  const generateQuestions = () => {
    const generated = [];
    const usedIngredients = new Set();

    for (let i = 0; i < totalQuestions; i++) {
      // Get random ingredient
      let ingredient;
      do {
        ingredient = ingredients[Math.floor(Math.random() * ingredients.length)];
      } while (usedIngredients.has(ingredient.name) || !ingredient.benefits || ingredient.benefits.length === 0);
      
      usedIngredients.add(ingredient.name);

      // Question type: Match benefit to ingredient
      const correctBenefit = ingredient.benefits[Math.floor(Math.random() * ingredient.benefits.length)];
      
      // Generate wrong answers
      const wrongIngredients = [];
      while (wrongIngredients.length < 3) {
        const wrong = ingredients[Math.floor(Math.random() * ingredients.length)];
        if (wrong.name !== ingredient.name && !wrongIngredients.find(w => w.name === wrong.name)) {
          wrongIngredients.push(wrong);
        }
      }

      const allOptions = [ingredient, ...wrongIngredients].sort(() => Math.random() - 0.5);

      generated.push({
        question: `Which ingredient supports ${correctBenefit}?`,
        options: allOptions,
        correctAnswer: ingredient.name,
        benefit: correctBenefit
      });
    }

    return generated;
  };

  const startGame = () => {
    gameEngine.startGame('ingredient-quiz');
    setQuestions(generateQuestions());
    setGameState('playing');
    setCurrentQuestion(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(30);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswer = (answer) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === questions[currentQuestion].correctAnswer;
    
    if (isCorrect) {
      const basePoints = 10;
      const timeBonus = timeLeft > 20 ? 5 : 0;
      const streakMultiplier = streak >= 3 ? 2 : 1;
      const points = (basePoints + timeBonus) * streakMultiplier;
      
      setScore(score + points);
      setStreak(streak + 1);
      audioManager.play('ui-success');
    } else {
      setStreak(0);
      audioManager.play('ui-error');
    }

    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setTimeLeft(30);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        finishGame();
      }
    }, 1500);
  };

  const finishGame = () => {
    gameEngine.endGame('ingredient-quiz', score);
    setGameState('finished');
  };

  if (gameState === 'start') {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🧠</div>
        <h2 className="text-3xl font-bold text-white mb-4">Ingredient Quiz</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          Test your knowledge about ingredients and their benefits!
          <br />
          Answer 10 questions as quickly as possible.
        </p>
        <Button size="lg" onClick={startGame} className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
          Start Quiz
        </Button>
      </div>
    );
  }

  if (gameState === 'finished') {
    const percentage = (score / (totalQuestions * 10)) * 100;
    return (
      <div className="text-center py-12 animate-scale-in">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-3xl font-bold text-white mb-4">Quiz Complete!</h2>
        <div className="text-5xl font-bold text-emerald-400 mb-6">{score} points</div>
        <p className="text-white/80 mb-8">
          You got {percentage.toFixed(0)}% of questions right!
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={startGame} className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
            Play Again
          </Button>
          <Button size="lg" variant="outline" onClick={() => setGameState('start')} className="border-white/20 text-white hover:bg-white/10">
            Back
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  if (!currentQ) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-white/60">Question {currentQuestion + 1}/{totalQuestions}</div>
          {streak > 0 && (
            <div className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-sm font-semibold">
              🔥 {streak} Streak
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-white">
          <Clock className="h-5 w-5" />
          <span className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : ''}`}>{timeLeft}s</span>
        </div>
      </div>

      <Progress value={(currentQuestion / totalQuestions) * 100} className="h-2" />

      {/* Question */}
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-500/30">
        <CardContent className="p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">{currentQ.question}</h3>
          <p className="text-white/60">Select the correct ingredient</p>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQ.options.map((option, index) => {
          const isSelected = selectedAnswer === option.name;
          const isCorrect = option.name === currentQ.correctAnswer;
          const showCorrect = showResult && isCorrect;
          const showWrong = showResult && isSelected && !isCorrect;

          return (
            <button
              type="button"
              key={index}
              onClick={() => handleAnswer(option.name)}
              disabled={showResult}
              className={
                `bg-black/40 backdrop-blur-sm border-2 rounded-lg p-6 transition-all hover:scale-105 disabled:cursor-not-allowed ${
                  showCorrect ? 'border-green-500 bg-green-500/20' :
                  showWrong ? 'border-red-500 bg-red-500/20' :
                  'border-white/20 hover:border-purple-500'
                }`
              }
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{option.icon}</div>
                <div className="flex-1 text-left">
                  <div className="text-white font-semibold">{option.name}</div>
                </div>
                {showCorrect && <CheckCircle className="h-6 w-6 text-green-400" />}
                {showWrong && <XCircle className="h-6 w-6 text-red-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Score */}
      <div className="text-center">
        <div className="text-sm text-white/60">Current Score</div>
        <div className="text-3xl font-bold text-emerald-400">{score}</div>
      </div>
    </div>
  );
}
