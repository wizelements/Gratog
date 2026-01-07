'use client';

import { Droplets, Heart, Moon, Sun, Waves } from 'lucide-react';

const steps = [
  {
    icon: Waves,
    title: 'Harvested from the Depths',
    body: 'Wildcrafted sea moss, pulled from pristine Atlantic waters and sun-dried to lock in minerals.',
  },
  {
    icon: Sun,
    title: 'Sun-Dried Perfection',
    body: 'Each batch is carefully sun-dried using traditional methods, preserving the full spectrum of 92 minerals.',
  },
  {
    icon: Heart,
    title: 'Crafted with Gratitude',
    body: 'Small batches infused with intention, cleansing and soaking rituals inspired by Caribbean tradition.',
  },
  {
    icon: Moon,
    title: 'Your Daily Ritual',
    body: 'Scoop, stir, sip. Build a calm-before-bed ritual around your favorite flavor and intention.',
  },
];

export default function JourneyTimeline() {
  return (
    <div className="grid md:grid-cols-[1.2fr,0.8fr] gap-10 items-center">
      <div className="space-y-6">
        <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-emerald-100">
          The Journey
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold text-emerald-50">
          Drift Through Your Wellness Journey
        </h2>
        <p className="text-emerald-50 text-base md:text-lg leading-relaxed">
          Scroll to move through each layer—from ocean to jar to your daily rituals.
          Every stop is a chapter in your sea moss story.
        </p>

        <ol className="space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="flex items-start gap-4 bg-slate-900/80 border border-emerald-500/40 rounded-xl p-4 md:p-5"
              >
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 flex-shrink-0">
                  <Icon className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-200 mb-1">
                    Step {i + 1}
                  </p>
                  <h3 className="text-base md:text-lg font-semibold text-emerald-50">
                    {step.title}
                  </h3>
                  <p className="text-emerald-100 text-sm md:text-base mt-1 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="relative h-64 md:h-96 hidden md:block">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-700/60 via-slate-950/80 to-teal-800/60 border border-emerald-500/40 shadow-2xl shadow-emerald-700/40 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-400 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-teal-400 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="absolute inset-6 flex flex-col justify-center items-center gap-4">
            <div className="flex gap-4">
              <div className="w-14 h-24 bg-gradient-to-b from-emerald-200 to-emerald-300 rounded-2xl shadow-xl shadow-emerald-500/40 transform -rotate-6" />
              <div className="w-16 h-28 bg-gradient-to-b from-emerald-100 to-emerald-200 rounded-2xl shadow-xl shadow-emerald-400/50 scale-110" />
              <div className="w-14 h-24 bg-gradient-to-b from-teal-200 to-teal-300 rounded-2xl shadow-xl shadow-teal-500/40 transform rotate-6" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-100 mt-4">
              Floating in Wellness
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
