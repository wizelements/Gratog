'use client';

import { useState, useEffect } from 'react';
import { useRewardsStore } from '@/stores/rewards';
import { Trophy, Star, Crown, Gem } from 'lucide-react';
import Link from 'next/link';

const TIER_CONFIG = {
  bronze: {
    icon: Trophy,
    label: 'Bronze',
    bgClass: 'bg-gradient-to-r from-amber-600 to-amber-700',
    textClass: 'text-amber-50',
    emoji: '🥉'
  },
  silver: {
    icon: Star,
    label: 'Silver',
    bgClass: 'bg-gradient-to-r from-slate-400 to-slate-500',
    textClass: 'text-slate-50',
    emoji: '🥈'
  },
  gold: {
    icon: Crown,
    label: 'Gold',
    bgClass: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    textClass: 'text-amber-50',
    emoji: '🥇'
  },
  platinum: {
    icon: Gem,
    label: 'Platinum',
    bgClass: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    textClass: 'text-emerald-50',
    emoji: '💎'
  }
};

export default function RewardsBadge({ showPoints = true, compact = false }) {
  const { points, tier } = useRewardsStore();
  const [mounted, setMounted] = useState(false);
  const [animatedPoints, setAnimatedPoints] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const duration = 500;
    const startTime = Date.now();
    const startValue = animatedPoints;
    const endValue = points;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);
      
      setAnimatedPoints(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [points, mounted]);

  if (!mounted) {
    return null;
  }

  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  const TierIcon = tierConfig.icon;

  if (compact) {
    return (
      <Link href="/rewards" className="group">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${tierConfig.bgClass} ${tierConfig.textClass} text-xs font-medium shadow-sm transition-transform group-hover:scale-105`}>
          <TierIcon className="w-3 h-3" />
          <span>{animatedPoints}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/rewards" className="group">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tierConfig.bgClass} ${tierConfig.textClass} text-sm font-medium shadow-md transition-all group-hover:shadow-lg group-hover:scale-105`}>
        <TierIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{tierConfig.label}</span>
        {showPoints && (
          <>
            <span className="hidden sm:inline text-white/60">•</span>
            <span className="font-bold">{animatedPoints.toLocaleString()} pts</span>
          </>
        )}
      </div>
    </Link>
  );
}
