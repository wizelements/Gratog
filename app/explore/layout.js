'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Home, Maximize, Minimize } from 'lucide-react';
import ParticleSystem from '@/components/explore/interactive/ParticleSystem';
import audioManager from '@/lib/explore/audio-manager';
import KioskProvider, { useKiosk } from '@/components/explore/kiosk/KioskProvider';
import KioskLayout from '@/components/explore/kiosk/KioskLayout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function ExploreContent({ children }) {
  const [audioMuted, setAudioMuted] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const { isKioskMode, enableKiosk, disableKiosk } = useKiosk();

  useEffect(() => {
    setAudioMuted(audioManager.isMuted());
    
    // Preload sounds for games
    audioManager.preload(['ui-success', 'ui-error', 'game-complete']);
  }, []);

  const toggleAudio = () => {
    const newMuted = !audioMuted;
    audioManager.setMute(newMuted);
    setAudioMuted(newMuted);
  };

  const toggleKiosk = async () => {
    if (isKioskMode) {
      disableKiosk();
    } else {
      await enableKiosk();
    }
  };

  return (
    <KioskLayout className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 relative overflow-hidden">
      {/* Particle Background */}
      {showParticles && <ParticleSystem type="ingredients" count={30} />}

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/explore" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="text-4xl">🌿</div>
              <div>
                <h1 className="text-2xl font-bold text-white">Interactive Hub</h1>
                <p className="text-sm text-emerald-300">Explore • Learn • Play</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Home className="h-4 w-4 mr-2" />
                  Main Site
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleAudio}
                className="text-white hover:bg-white/10"
              >
                {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleKiosk}
                className={`text-white ${isKioskMode ? 'bg-emerald-600/30 hover:bg-emerald-600/40' : 'hover:bg-white/10'}`}
                title="Toggle Kiosk Mode"
              >
                {isKioskMode ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-white/60">
          <p className="text-sm">Taste of Gratitude Interactive Experience</p>
          <p className="text-xs mt-2">Built with ❤️ for wellness exploration</p>
        </div>
      </footer>
    </KioskLayout>
  );
}

export default function ExploreLayout({ children }) {
  return (
    <KioskProvider idleTimeout={180000} resetRoute="/explore">
      <ExploreContent>{children}</ExploreContent>
    </KioskProvider>
  );
}
