'use client';

import { useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { snippetSelector } from '@/lib/music/snippetDatabase';

export function BackgroundMusic() {
  const music = useMusic();

  useEffect(() => {
    if (!music.enabled) return;

    // Start with intro phase music on mount
    const introSnippet = snippetSelector.selectForContext('intro');
    music.play(introSnippet.id, 2000).catch(e => console.log('Auto-play may be blocked:', e));

    return () => {
      // Fade out on unmount
      music.pause(2000).catch(() => {});
    };
  }, [music.enabled, music.play, music.pause]);

  // This component renders nothing - it's purely audio orchestration
  return null;
}
