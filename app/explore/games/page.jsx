'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Zap, Target, Brain, Droplet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import gameEngine from '@/lib/explore/game-engine';

const GAMES = [
  {
    id: 'benefit-sort',
    title: 'Benefit Sort',
    description: 'Drag ingredients to matching benefits and test your knowledge',
    icon: Target,
    color: 'from-emerald-500 to-teal-600',
    route: '/explore/games/benefit-sort',
    difficulty: 'Medium',
    isNew: false
  },
  {
    id: 'ingredient-rush',
    title: 'Ingredient Rush',
    description: 'Tap ingredients matching the target benefit - race against time!',
    icon: Zap,
    color: 'from-yellow-500 to-orange-600',
    route: '/explore/games/ingredient-rush',
    difficulty: 'Hard',
    isNew: false
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    description: 'Match ingredient pairs to sharpen your memory and learn benefits',
    icon: Brain,
    color: 'from-blue-500 to-cyan-600',
    route: '/explore/games/memory-match',
    difficulty: 'Easy',
    coming: true
  },
  {
    id: 'ingredient-quiz',
    title: 'Ingredient Quiz',
    description: 'Test your knowledge of health benefits and ingredients',
    icon: Star,
    color: 'from-purple-500 to-pink-600',
    route: '/explore/games/ingredient-quiz',
    difficulty: 'Medium',
    coming: true
  },
  {
    id: 'blend-maker',
    title: 'Blend Maker',
    description: 'Create your perfect wellness blend with interactive feedback',
    icon: Droplet,
    color: 'from-green-500 to-emerald-600',
    route: '/explore/games/blend-maker',
    difficulty: 'Easy',
    coming: true
  }
];

export default function GamesIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/explore">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Interactive Games
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn about ingredients and health benefits through fun, engaging games
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {GAMES.map((game) => {
            const highScore = gameEngine.getHighScore(game.id) || 0;
            const Icon = game.icon;

            return (
              <Card key={game.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${game.color}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {game.coming && (
                        <Badge className="bg-gradient-to-r from-orange-500 to-yellow-600">
                          COMING SOON
                        </Badge>
                      )}
                      {!game.coming && game.isNew && (
                        <Badge className="bg-gradient-to-r from-pink-500 to-rose-600">
                          NEW
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {game.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{game.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">{game.description}</p>

                  {highScore > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-900">
                        High Score: {highScore}
                      </span>
                    </div>
                  )}

                  {game.coming ? (
                    <Button 
                      disabled
                      className={`w-full bg-gradient-to-r ${game.color} hover:opacity-90 transition-opacity opacity-50 cursor-not-allowed`}
                    >
                      Coming Soon
                    </Button>
                  ) : (
                    <Link href={game.route}>
                      <Button 
                        className={`w-full bg-gradient-to-r ${game.color} hover:opacity-90 transition-opacity`}
                      >
                        Play Now
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Leaderboard Section (Future Enhancement) */}
        <Card className="mt-12 max-w-4xl mx-auto bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="w-6 h-6 text-purple-600" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {GAMES.map((game) => {
                const highScore = gameEngine.getHighScore(game.id) || 0;
                const Icon = game.icon;

                return (
                  <div key={game.id} className="text-center p-4 bg-white rounded-lg">
                    <Icon className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-600 mb-1">{game.title}</p>
                    <p className="text-2xl font-bold text-purple-600">{highScore}</p>
                  </div>
                );
              })}
            </div>

            {GAMES.every(game => gameEngine.getHighScore(game.id) === 0) && (
              <p className="text-center text-gray-500 py-8">
                Play games to start tracking your high scores!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
