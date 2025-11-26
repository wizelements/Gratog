'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function AttractMode({ onInteraction }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      emoji: '🌊',
      title: 'Welcome to',
      subtitle: 'Taste of Gratitude',
      description: 'Explore wellness through interactive experiences'
    },
    {
      emoji: '🌿',
      title: '46 Ingredients',
      subtitle: 'Discover Nature',
      description: 'Learn about powerful natural ingredients'
    },
    {
      emoji: '🎮',
      title: 'Play & Learn',
      subtitle: 'Interactive Games',
      description: 'Test your knowledge while having fun'
    },
    {
      emoji: '📦',
      title: '3D Experience',
      subtitle: 'View in AR',
      description: 'See products in your space'
    },
    {
      emoji: '👆',
      title: 'Tap to Start',
      subtitle: 'Your Wellness Journey',
      description: 'Touch anywhere to explore'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 z-50 flex items-center justify-center cursor-pointer"
      onClick={onInteraction}
    >
      <div className="text-center px-8 animate-fade-in">
        <div className="text-9xl mb-8 animate-bounce-gentle">
          {slides[currentSlide].emoji}
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">
          {slides[currentSlide].title}
        </h1>
        <h2 className="text-4xl font-semibold text-emerald-300 mb-6">
          {slides[currentSlide].subtitle}
        </h2>
        <p className="text-2xl text-white/80 mb-12">
          {slides[currentSlide].description}
        </p>

        {currentSlide === slides.length - 1 && (
          <div className="mt-8 flex items-center justify-center gap-3 text-white/60 animate-pulse">
            <Sparkles className="h-8 w-8" />
            <span className="text-xl">Tap anywhere to begin</span>
            <Sparkles className="h-8 w-8" />
          </div>
        )}

        {/* Slide indicators */}
        <div className="flex gap-3 justify-center mt-12">
          {slides.map((_, index) => (
            <div
              key={index}
              className={
                `w-3 h-3 rounded-full transition-all ${
                  index === currentSlide
                    ? 'bg-emerald-400 w-8'
                    : 'bg-white/30'
                }`
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
