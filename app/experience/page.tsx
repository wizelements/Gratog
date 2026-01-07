'use client';

import ExperienceLayout from './components/ExperienceLayout';
import ExperienceHero from './components/ExperienceHero';
import ExperienceScrollSection from './components/ExperienceScrollSection';
import JourneyTimeline from './components/JourneyTimeline';
import MineralGalaxy from './components/MineralGalaxy';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

const FridgeExperience = dynamic(
  () => import('./components/FridgeExperience.client'),
  {
    ssr: false,
    loading: () => (
      <div className="py-32 flex items-center justify-center bg-gradient-to-b from-slate-950 to-emerald-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-emerald-100/70 text-xs uppercase tracking-[0.2em]">
            Loading immersive fridge…
          </p>
        </div>
      </div>
    ),
  }
);

export default function ExperiencePage() {
  return (
    <ExperienceLayout>
      <ExperienceHero />

      <ExperienceScrollSection id="journey">
        <JourneyTimeline />
      </ExperienceScrollSection>

      <ExperienceScrollSection id="minerals" variant="right">
        <MineralGalaxy />
      </ExperienceScrollSection>

      <FridgeExperience />

      <section className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-emerald-100">
            Ready to Begin?
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-emerald-50">
            Start Your Wellness Journey Today
          </h2>
          <p className="text-emerald-50 text-base md:text-lg leading-relaxed">
            Explore our full collection of wildcrafted sea moss products
            and find the perfect addition to your daily ritual.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/catalog">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-8 py-3 shadow-lg shadow-emerald-500/30">
                <Sparkles className="h-4 w-4 mr-2" />
                Shop All Products
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </ExperienceLayout>
  );
}
