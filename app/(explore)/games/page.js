'use client';

import { useState, useEffect } from 'react';
import { Gamepad2, Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BlendMaker from '@/components/explore/games/BlendMaker';
import IngredientQuiz from '@/components/explore/games/IngredientQuiz';
import MemoryMatch from '@/components/explore/games/MemoryMatch';
import { getAllExtendedIngredients } from '@/lib/ingredient-data-extended';
import gameEngine from '@/lib/explore/game-engine';

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [highScores, setHighScores] = useState({});

  useEffect(() => {
    const allIngredients = getAllExtendedIngredients();
    setIngredients(Object.values(allIngredients));
    setHighScores(gameEngine.getAllHighScores());
  }, []);

  const games = [
    {
      id: 'blend-maker',
      name: 'Blend Maker',
      description: 'Create custom blends by combining ingredients',
      emoji: '🥤',
      color: 'from-emerald-500 to-green-600',
      component: <BlendMaker ingredients={ingredients} />
    },
    {
      id: 'ingredient-quiz',
      name: 'Ingredient Quiz',
      description: 'Test your knowledge about ingredients and benefits',
      emoji: '🧠',
      color: 'from-purple-500 to-pink-600',
      component: <IngredientQuiz ingredients={ingredients} />
    },
    {
      id: 'memory-match',
      name: 'Memory Match',
      description: 'Match pairs of ingredients to win',
      emoji: '🎴',
      color: 'from-blue-500 to-cyan-600',
      component: <MemoryMatch ingredients={ingredients} />
    }
  ];

  if (activeGame) {
    const game = games.find(g => g.id === activeGame);
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => setActiveGame(null)}
            className="text-white hover:bg-white/10 mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Button>

          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{game.emoji}</div>
            <h1 className="text-4xl font-bold text-white mb-2">{game.name}</h1>
            <p className="text-white/60">{game.description}</p>
          </div>

          {game.component}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-5xl font-bold text-white mb-4">Wellness Games</h1>
          <p className="text-xl text-emerald-300 mb-8 max-w-2xl mx-auto">
            Learn about ingredients while having fun!
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {games.map((game, index) => (
            <Card
              key={game.id}
              className="bg-black/40 border-white/10 backdrop-blur-sm hover:bg-black/60 transition-all cursor-pointer hover:scale-105 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => setActiveGame(game.id)}
            >
              <CardHeader>
                <div className="text-6xl mb-4 text-center">{game.emoji}</div>
                <CardTitle className="text-white text-xl text-center">{game.name}</CardTitle>
                <CardDescription className="text-white/60 text-center">
                  {game.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className={`w-full bg-gradient-to-r ${game.color} hover:opacity-90`}>
                  Play Now
                  <Gamepad2 className="ml-2 h-4 w-4" />
                </Button>
                {highScores[game.id] > 0 && (
                  <div className="mt-3 text-center text-sm text-emerald-400">
                    <Trophy className="h-4 w-4 inline mr-1" />
                    High Score: {highScores[game.id]}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leaderboard */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              Your High Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(highScores).length === 0 ? (
              <div className="text-center py-8 text-white/60">
                Play some games to set high scores!
              </div>
            ) : (
              <div className="space-y-3">
                {games.map(game => (
                  <div key={game.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{game.emoji}</div>
                      <div>
                        <div className="text-white font-semibold">{game.name}</div>
                        <div className="text-white/60 text-sm">
                          {highScores[game.id] > 0 ? `${highScores[game.id]} points` : 'Not played yet'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveGame(game.id)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Play
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
