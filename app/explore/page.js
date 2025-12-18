'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Gamepad2, Box, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExploreHomepage() {
  const [hoveredCard, setHoveredCard] = useState(null);

  const features = [
    {
      id: 'ingredients',
      icon: <Sparkles className="h-8 w-8" />,
      title: 'Ingredient Explorer',
      description: 'Discover 46 powerful ingredients and their wellness benefits',
      color: 'from-emerald-500 to-green-600',
      href: '/explore/ingredients',
      emoji: '🌿'
    },
    {
      id: 'games',
      icon: <Gamepad2 className="h-8 w-8" />,
      title: 'Wellness Games',
      description: 'Play interactive games and learn while having fun',
      color: 'from-purple-500 to-pink-600',
      href: '/explore/games',
      emoji: '🎮'
    },
    {
      id: 'showcase',
      icon: <Box className="h-8 w-8" />,
      title: '3D Showcase',
      description: 'View products in 3D and experience them in AR',
      color: 'from-blue-500 to-cyan-600',
      href: '/explore/showcase',
      emoji: '📦'
    },
    {
      id: 'learn',
      icon: <BookOpen className="h-8 w-8" />,
      title: 'Learning Center',
      description: 'Deep-dive into ingredient stories and wellness science',
      color: 'from-amber-500 to-orange-600',
      href: '/explore/learn',
      emoji: '📚'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-8 animate-fade-in-up">
            <div className="text-7xl mb-4">🌊</div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
              Explore Wellness
            </h1>
            <p className="text-xl md:text-2xl text-emerald-300 mb-8 max-w-2xl mx-auto">
              Dive into an interactive journey through ingredients, science, and fun
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link href="/explore/ingredients">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-6 text-lg">
                Start Exploring
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/explore/games">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg">
                Play Games
                <Gamepad2 className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 animate-bounce">
            <div className="text-white/40 text-sm">Scroll to explore</div>
            <div className="text-white/40 text-2xl">↓</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link key={feature.id} href={feature.href}>
                <Card 
                  className={
                    `bg-black/40 border-white/10 backdrop-blur-sm hover:bg-black/60 transition-all duration-300 cursor-pointer h-full ${
                      hoveredCard === feature.id ? 'scale-105 shadow-2xl shadow-emerald-500/20' : ''
                    }`
                  }
                  onMouseEnter={() => setHoveredCard(feature.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <CardHeader>
                    <div className="mb-4">
                      <div className="text-5xl mb-2">{feature.emoji}</div>
                      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color}`}>
                        {feature.icon}
                      </div>
                    </div>
                    <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-white/60">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-emerald-400 hover:text-emerald-300 transition-colors">
                      <span className="text-sm font-semibold">Explore</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-black/20">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="animate-fade-in-up">
              <div className="text-5xl font-bold text-emerald-400 mb-2">46</div>
              <div className="text-white/60">Unique Ingredients</div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-5xl font-bold text-emerald-400 mb-2">3</div>
              <div className="text-white/60">Interactive Games</div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl font-bold text-emerald-400 mb-2">∞</div>
              <div className="text-white/60">Ways to Learn</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 rounded-2xl p-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Start Your Wellness Journey?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Discover the power of natural ingredients through interactive exploration
            </p>
            <Link href="/explore/ingredients">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-6 text-lg">
                Begin Exploring
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
