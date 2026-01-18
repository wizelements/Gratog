'use client';

import { useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { snippetSelector } from '@/lib/music/snippetDatabase';

export function BackgroundMusic() {
  const music = useMusic();

  useEffect(() => {
    if (!music.enabled) return;

    let isMounted = true;
    let fadeTimeout: NodeJS.Timeout | null = null;

    // Start with intro phase music on mount
    const startMusic = async () => {
      try {
        const introSnippet = snippetSelector.selectForContext('intro');
        if (isMounted) {
          await music.play(introSnippet.id, 2000);
        }
      } catch (error) {
        // Browser autoplay policy may block—this is expected
        if (isMounted) {
          console.debug('AutoPlay blocked (expected):', error instanceof Error ? error.message : 'Unknown error');
        }
      }
    };

    startMusic();

    return () => {
      isMounted = false;
      if (fadeTimeout) clearTimeout(fadeTimeout);
      
      // Fade out on unmount
      music.pause(500).catch(err => {
        console.debug('Pause on unmount failed:', err instanceof Error ? err.message : 'Unknown');
      });
    };
  }, [music.enabled, music.play, music.pause]);

  // This component renders nothing - it's purely audio orchestration
  return null;
}
