'use client';

import { Shield, Award, RefreshCw, Lock } from 'lucide-react';

export default function TrustBadges({ layout = 'horizontal' }) {
  const badges = [
    {
      icon: Shield,
      text: "30-Day Money Back",
      color: "text-emerald-600"
    },
    {
      icon: Lock,
      text: "Secure Checkout",
      color: "text-blue-600"
    },
    {
      icon: Award,
      text: "Lab Tested 92 Minerals",
      color: "text-purple-600"
    },
    {
      icon: RefreshCw,
      text: "Free Returns",
      color: "text-orange-600"
    }
  ];

  return (
    <div className={
      layout === 'horizontal'
        ? "flex flex-wrap items-center justify-center gap-4"
        : "grid grid-cols-1 md:grid-cols-2 gap-4"
    }>
      {badges.map((badge, index) => {
        const Icon = badge.icon;
        return (
          <div 
            key={index}
            className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200"
          >
            <Icon className={`h-5 w-5 ${badge.color}`} />
            <span className="text-sm font-medium text-gray-700">{badge.text}</span>
          </div>
        );
      })}
    </div>
  );
}
