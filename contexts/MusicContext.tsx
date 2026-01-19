'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

export type SessionPhase = 'intro' | 'reflection' | 'journal' | 'share' | 'meditation';
export type Emotion = 'peace' | 'hope' | 'vulnerability' | 'acceptance' | 'joy';

export interface Snippet {
  id: string;
  title: string;
  emotion: Emotion;
  arousal: 'low' | 'medium' | 'high';
  audioPath: string;
  duration: number;
  targetPhases: SessionPhase[];
}

interface MusicState {
  isPlaying: boolean;
  currentSnippet: Snippet | null;
  volume: number; // -20 to 0 dB
  sessionPhase: SessionPhase;
  enabled: boolean;
}

interface MusicContextType extends MusicState {
  play: (snippetId: string, fadeIn?: number) => Promise<void>;
  pause: (fadeOut?: number) => Promise<void>;
  setVolume: (dB: number) => void;
  transitionTo: (snippetId: string, duration?: number) => Promise<void>;
  setSessionPhase: (phase: SessionPhase) => void;
  setEnabled: (enabled: boolean) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<MusicState>({
    isPlaying: false,
    currentSnippet: null,
    volume: -10,
    sessionPhase: 'intro',
    enabled: false, // Default to false - only enable after user interaction
  });
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  const isMountedRef = useRef(true);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Clear fade interval helper
  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  // Initialize audio element and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    const audio = new Audio();
    // Don't set crossOrigin - R2 public buckets don't need it and it can cause CORS issues
    audio.preload = 'auto';
    audioRef.current = audio;
    
    // Debug: log audio events
    audio.addEventListener('canplay', () => console.debug('[Music] Audio can play'));
    audio.addEventListener('error', (e) => console.error('[Music] Audio error:', audio.error?.message || e));
    audio.addEventListener('loadstart', () => console.debug('[Music] Loading audio...'));
    audio.addEventListener('playing', () => console.debug('[Music] Now playing'));
    
    // Load user preferences (safely handle localStorage)
    try {
      const savedVolume = localStorage.getItem('music_volume');
      const savedEnabled = localStorage.getItem('music_enabled');
      
      if (savedVolume) setState(p => ({ ...p, volume: parseFloat(savedVolume) }));
      // Only restore enabled if explicitly set by user before
      if (savedEnabled === 'true') setState(p => ({ ...p, enabled: true }));
    } catch (error) {
      console.debug('localStorage unavailable, using defaults:', error instanceof Error ? error.message : 'unknown error');
    }

    // Provider cleanup - prevent memory leaks and setState after unmount
    return () => {
      isMountedRef.current = false;
      clearFade();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [clearFade]);

  const dbToLinear = useCallback((db: number): number => {
    return Math.pow(10, db / 20);
  }, []);

  const linearToDb = useCallback((linear: number): number => {
    return 20 * Math.log10(linear);
  }, []);

  const play = useCallback((snippetId: string, fadeInDuration = 1000): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('[Music] No audio element');
      return Promise.resolve();
    }

    clearFade();

    const snippet = { id: snippetId } as Snippet;

    const R2_BASE = 'https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev';
    const pathMap: Record<string, string> = {
      'that_gratitude_intro': `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
      'that_gratitude_processing': `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
      'that_gratitude_climax': `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
      'that_gratitude_loop': `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
      'cant_let_it_go_struggle': `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
      'cant_let_it_go_acceptance': `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
      'cant_let_it_go_victory': `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
      'cant_let_it_go_journey': `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
      'under_covers_opening': `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
      'under_covers_vulnerability': `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
      'under_covers_warmth': `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
      'under_covers_loop': `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
    };

    const audioUrl = pathMap[snippetId] || `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`;
    console.debug('[Music] Loading:', audioUrl);
    
    audio.src = audioUrl;
    audio.volume = 0;
    audio.load(); // Explicitly load

    return new Promise<void>((resolve, reject) => {
      console.debug('[Music] Attempting to play...');
      
      audio.play()
        .then(() => {
          console.debug('[Music] Play started successfully');
          if (!isMountedRef.current) {
            resolve();
            return;
          }
          
          setState(p => ({ ...p, isPlaying: true, currentSnippet: snippet }));

          let elapsed = 0;
          const step = 50;
          const startVolume = dbToLinear(-20);
          const targetVolume = dbToLinear(stateRef.current.volume);

          fadeIntervalRef.current = setInterval(() => {
            elapsed += step;
            if (elapsed >= fadeInDuration) {
              audio.volume = targetVolume;
              clearFade();
              resolve();
            } else {
              const progress = elapsed / fadeInDuration;
              audio.volume = startVolume + (targetVolume - startVolume) * progress;
            }
          }, step);
        })
        .catch((e) => {
          console.error('[Music] Play failed:', e.name, e.message);
          if (isMountedRef.current) {
            setState(p => ({ ...p, isPlaying: false }));
          }
          reject(e);
        });
    });
  }, [dbToLinear, clearFade]);

  const pause = useCallback((fadeOutDuration = 1000): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return Promise.resolve();

    clearFade();

    return new Promise<void>((resolve) => {
      let elapsed = 0;
      const step = 50;
      const startVolume = audio.volume;

      fadeIntervalRef.current = setInterval(() => {
        elapsed += step;
        if (elapsed >= fadeOutDuration) {
          audio.pause();
          audio.volume = dbToLinear(stateRef.current.volume);
          clearFade();
          if (isMountedRef.current) {
            setState(p => ({ ...p, isPlaying: false }));
          }
          resolve();
        } else {
          const progress = elapsed / fadeOutDuration;
          audio.volume = startVolume * (1 - progress);
        }
      }, step);
    });
  }, [dbToLinear, clearFade]);

  const transitionTo = useCallback(async (snippetId: string, duration = 3000) => {
    await pause(duration / 2);
    await new Promise(resolve => setTimeout(resolve, duration / 2));
    await play(snippetId, duration / 2);
  }, [play, pause]);

  const setVolume = useCallback((dB: number) => {
    const clipped = Math.max(-20, Math.min(0, dB));
    const linear = dbToLinear(clipped);
    if (audioRef.current) {
      audioRef.current.volume = linear;
    }
    setState(p => ({ ...p, volume: clipped }));
    try {
      localStorage.setItem('music_volume', clipped.toString());
    } catch (error) {
      console.debug('localStorage write failed:', error instanceof Error ? error.message : 'unknown error');
    }
  }, [dbToLinear]);

  const setSessionPhase = useCallback((phase: SessionPhase) => {
    setState(p => ({ ...p, sessionPhase: phase }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setState(p => ({ ...p, enabled }));
    try {
      localStorage.setItem('music_enabled', enabled.toString());
    } catch (error) {
      console.debug('localStorage write failed:', error instanceof Error ? error.message : 'unknown error');
    }
    if (!enabled) {
      clearFade();
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      setState(p => ({ ...p, isPlaying: false }));
    }
  }, [clearFade]);

  return (
    <MusicContext.Provider
      value={{
        ...state,
        play,
        pause,
        setVolume,
        transitionTo,
        setSessionPhase,
        setEnabled,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within MusicProvider');
  }
  return context;
}
