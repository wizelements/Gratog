'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { useRouter, usePathname } from 'next/navigation';
import kioskMode from '@/lib/explore/kiosk-mode';
import audioManager from '@/lib/explore/audio-manager';
import gameEngine from '@/lib/explore/game-engine';
import AttractMode from './AttractMode';

const KioskContext = createContext({});

export const useKiosk = () => useContext(KioskContext);

export default function KioskProvider({ 
  children, 
  idleTimeout = 180000, // 3 minutes
  resetRoute = '/explore'
}) {
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showAttract, setShowAttract] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isKioskMode) return;

    const handleIdle = () => {
      console.log('[KioskProvider] Idle timeout - showing attract mode');
      
      // Stop any background audio
      audioManager.stopBackgroundMusic();
      
      // Clear active game if any
      const activeGame = sessionStorage.getItem('activeGame');
      if (activeGame) {
        gameEngine.endGame(activeGame, 0);
        sessionStorage.removeItem('activeGame');
      }
      
      // Reset to explore home
      if (pathname !== resetRoute) {
        router.push(resetRoute);
      }
      
      // Show attract mode
      setShowAttract(true);
    };

    kioskMode.onIdle(handleIdle);

    return () => {
      kioskMode.onIdle(null);
    };
  }, [isKioskMode, pathname, resetRoute, router]);

  useEffect(() => {
    if (!isKioskMode) return;

    const resetIdleTimer = () => {
      kioskMode.resetIdleTimer();
    };

    // Reset timer on any user interaction
    window.addEventListener('pointerdown', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);

    return () => {
      window.removeEventListener('pointerdown', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
    };
  }, [isKioskMode]);

  const enableKiosk = async () => {
    try {
      const enabled = kioskMode.enable({
        fullscreen: true,
        idleTimeout
      });
      
      if (enabled) {
        setIsKioskMode(true);
        
        // Suppress text selection and context menu
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.addEventListener('contextmenu', preventContextMenu);
      }
    } catch (error) {
      console.error('[KioskProvider] Failed to enable kiosk mode:', error);
    }
  };

  const disableKiosk = () => {
    kioskMode.disable();
    setIsKioskMode(false);
    setShowAttract(false);
    
    // Restore interactions
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.removeEventListener('contextmenu', preventContextMenu);
  };

  const preventContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  const hideAttract = () => {
    setShowAttract(false);
    kioskMode.resetIdleTimer();
  };

  const value = {
    isKioskMode,
    showAttract,
    enableKiosk,
    disableKiosk,
    hideAttract
  };

  return (
    <KioskContext.Provider value={value}>
      {children}
      {isKioskMode && showAttract && (
        <div 
          className="fixed inset-0 z-50" 
          onClick={hideAttract}
          onTouchStart={hideAttract}
        >
          <AttractMode />
        </div>
      )}
    </KioskContext.Provider>
  );
}
