'use client';

import { useEffect, useRef } from 'react';
import { useMusic } from '@/contexts/MusicContext';

export function BackgroundMusic() {
  const music = useMusic();
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (!music.enabled || !music.isPlaying) return;
    
    hasPlayedRef.current = true;

    return () => {
      if (hasPlayedRef.current) {
        music.pause(500).catch(err => {
          console.debug('Pause on unmount failed:', err instanceof Error ? err.message : 'Unknown');
        });
      }
    };
  }, [music.enabled, music.isPlaying, music.pause]);

  return null;
}
