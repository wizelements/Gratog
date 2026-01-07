'use client';

import { motion } from 'framer-motion';
import { Sparkles, Leaf, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMouseParallax } from '../hooks/useMouseParallax';
import { useIsMobile } from '../hooks/useIsMobile';

export default function ExperienceHero() {
  const isMobile = useIsMobile();
  const { containerRef, getStyle } = useMouseParallax({
    strength: 50,
    disabled: isMobile,
  });

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] flex items-center justify-center px-4 pt-24 pb-16"
    >
      <motion.div
        style={getStyle(0.2)}
        className="pointer-events-none absolute -top-32 -left-24 w-72 h-72 bg-emerald-500/10 blur-3xl rounded-full"
      />
      <motion.div
        style={getStyle(0.4)}
        className="pointer-events-none absolute top-10 right-0 w-60 h-60 bg-teal-400/10 blur-3xl rounded-full"
      />
      <motion.div
        style={getStyle(0.6)}
        className="pointer-events-none absolute bottom-[-4rem] left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-emerald-300/5 blur-3xl rounded-full"
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 bg-slate-950/50 rounded-3xl px-4 py-8 md:px-8 md:py-12 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/80 bg-slate-900/80 px-4 py-2 text-[11px] md:text-xs uppercase tracking-[0.18em] text-emerald-50"
        >
          <Sparkles className="h-4 w-4" />
          Immersive Sea Moss Journey
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.9 }}
          className="text-4xl md:text-6xl font-bold leading-tight"
        >
          Drift Through the
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-100">
            Mineral Universe
          </span>
          of Sea Moss
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-base md:text-lg text-emerald-50 max-w-2xl mx-auto leading-relaxed"
        >
          Float through layers of benefits, ingredients, and rituals. Open the
          cold glow of our sea moss fridge and step into your next wellness chapter.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Link href="/catalog">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-8 py-3 shadow-lg shadow-emerald-500/30">
              Shop the Galaxy
            </Button>
          </Link>
          <a 
            href="#fridge" 
            className="text-emerald-50 text-base flex items-center gap-2 hover:text-emerald-200 transition-colors rounded-full px-2 -mx-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Droplets className="h-4 w-4" />
            Scroll to open the Fridge
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="flex flex-wrap justify-center gap-6 pt-6 text-sm md:text-base text-emerald-50"
        >
          <span className="inline-flex items-center gap-2">
            <Leaf className="h-4 w-4 text-emerald-300" />
            100% Wildcrafted
          </span>
          <span>92 Essential Minerals</span>
          <span>Hand-crafted Small Batches</span>
        </motion.div>
      </div>
    </section>
  );
}
