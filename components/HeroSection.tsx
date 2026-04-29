'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Play, Star } from 'lucide-react';
import { triggerHaptic, HapticPatterns } from '@/lib/haptics';

export function HeroSection() {
  const handleCTAClick = () => {
    triggerHaptic(HapticPatterns.MEDIUM);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-emerald-200/30 dark:bg-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-teal-200/30 dark:bg-teal-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-6"
            >
              <Star className="w-4 h-4 fill-current" />
              <span>92 Essential Minerals</span>
            </motion.div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              Nature's Most
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Powerful Superfood
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0">
              Handcrafted wildcrafted sea moss gel packed with everything your body needs. 
              From pristine ocean waters to your daily wellness routine.
            </p>

            {/* Stats */}
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-8">
              {[
                { value: '92+', label: 'Minerals' },
                { value: '5.0', label: 'Star Rating' },
                { value: '14K+', label: 'Years of Use' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/catalog"
                onClick={handleCTAClick}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group"
              >
                Shop Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all duration-200">
                <Play className="w-5 h-5" />
                Watch Video
              </button>
            </div>
          </motion.div>

          {/* Image Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square lg:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1556228720-195a672e8a05?w=800&q=80"
                alt="Premium Sea Moss Products"
                fill
                className="object-cover"
                priority
              />
              
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute bottom-6 left-6 right-6 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <Star className="w-6 h-6 text-emerald-600 dark:text-emerald-400 fill-current" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Premium Quality</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">100% Wildcrafted</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
