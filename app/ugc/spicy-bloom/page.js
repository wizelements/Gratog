'use client';

import { useEffect } from 'react';
import UGCChallenge from '@/components/UGCChallenge';
import AnalyticsSystem from '@/lib/analytics';

export default function SpicyBloomChallengePage() {
  useEffect(() => {
    // Initialize analytics
    AnalyticsSystem.initPostHog();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🌶️✨</div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-4">
            The Spicy Bloom Challenge
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Experience the unique 10-second flavor journey of our Spicy Bloom shot. 
            Share your reaction and join our wellness community for a chance to win amazing prizes!
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
              Monthly Raffle
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              Community Prizes
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              Exclusive Rewards
            </div>
          </div>
        </div>
        
        <UGCChallenge />
        
        <div className="mt-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Join the Taste of Gratitude Community
            </h2>
            <p className="text-gray-600 mb-8">
              Follow us on social media to see featured challenge entries, 
              get wellness tips, and stay updated on new products and market locations.
            </p>
            <div className="flex justify-center gap-6 text-2xl">
              <a 
                href="https://instagram.com/tasteofgratitude" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
              >
                📸
              </a>
              <a 
                href="https://tiktok.com/@tasteofgratitude" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
              >
                🎵
              </a>
              <a 
                href="https://facebook.com/tasteofgratitude" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
              >
                👥
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}