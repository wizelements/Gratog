'use client';

import { Sparkles, Zap, Shield, Heart, Brain, Flame } from 'lucide-react';

const minerals = [
  {
    icon: Shield,
    name: 'Iodine',
    benefit: 'Thyroid Support',
    description: 'Essential for healthy thyroid function and metabolism regulation.',
  },
  {
    icon: Zap,
    name: 'Potassium',
    benefit: 'Natural Energy',
    description: 'Supports muscle function and maintains healthy energy levels.',
  },
  {
    icon: Heart,
    name: 'Calcium',
    benefit: 'Bone Strength',
    description: 'Builds and maintains strong bones and healthy heart rhythm.',
  },
  {
    icon: Brain,
    name: 'Magnesium',
    benefit: 'Mental Clarity',
    description: 'Supports brain function, reduces stress, and improves sleep.',
  },
  {
    icon: Flame,
    name: 'Iron',
    benefit: 'Vitality',
    description: 'Essential for oxygen transport and sustained energy.',
  },
  {
    icon: Sparkles,
    name: 'Zinc',
    benefit: 'Immune Power',
    description: 'Strengthens immune response and supports skin health.',
  },
];

export default function MineralGalaxy() {
  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-emerald-100 mb-3">
          The Galaxy Within
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold text-emerald-50 mb-4">
          92 Minerals, One Jar
        </h2>
        <p className="text-emerald-50 text-base md:text-lg leading-relaxed">
          Each spoonful contains a constellation of essential minerals your body craves.
          Explore the stars of your wellness universe.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {minerals.map((mineral, index) => {
          const Icon = mineral.icon;
          return (
            <div
              key={mineral.name}
              className="group relative bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-5 hover:bg-slate-900 hover:border-emerald-400/60 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute -top-2 -right-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-400/20 transition-all" />
              
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="h-6 w-6 text-emerald-300" />
                </div>
                
                <h3 className="text-lg font-semibold text-emerald-50 mb-1">
                  {mineral.name}
                </h3>
                <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-200 mb-2">
                  {mineral.benefit}
                </p>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  {mineral.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <p className="text-emerald-100 text-sm">
          + 86 more essential minerals in every jar — scroll down to open the cold glow and choose your ritual.
        </p>
      </div>
    </div>
  );
}
