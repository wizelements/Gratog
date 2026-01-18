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
    enabled: true,
  });
  const [recentSnippets, setRecentSnippets] = useState<string[]>([]);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audioRef.current = audio;
    
    // Load user preferences
    const savedVolume = localStorage.getItem('music_volume');
    const savedEnabled = localStorage.getItem('music_enabled');
    
    if (savedVolume) setState(p => ({ ...p, volume: parseFloat(savedVolume) }));
    if (savedEnabled !== null) setState(p => ({ ...p, enabled: savedEnabled === 'true' }));
  }, []);

  const dbToLinear = useCallback((db: number): number => {
    return Math.pow(10, db / 20);
  }, []);

  const linearToDb = useCallback((linear: number): number => {
    return 20 * Math.log10(linear);
  }, []);

  const play = useCallback(async (snippetId: string, fadeInDuration = 1000) => {
    if (!state.enabled) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Find snippet (will be in context from parent)
    const snippet = { id: snippetId } as Snippet;

    // Construct path based on snippet ID
    const pathMap: Record<string, string> = {
      'that_gratitude_intro': '/music/snippets/that-gratitude/intro_0-30s.mp3',
      'that_gratitude_processing': '/music/snippets/that-gratitude/processing_3-4min.mp3',
      'that_gratitude_climax': '/music/snippets/that-gratitude/climax_8-10min.mp3',
      'that_gratitude_loop': '/music/snippets/that-gratitude/ambient_loop_10min.mp3',
      'cant_let_it_go_struggle': '/music/snippets/cant-let-it-go/struggle_0-2min.mp3',
      'cant_let_it_go_acceptance': '/music/snippets/cant-let-it-go/acceptance_7-8min.mp3',
      'cant_let_it_go_victory': '/music/snippets/cant-let-it-go/victory_10-11min.mp3',
      'cant_let_it_go_journey': '/music/snippets/cant-let-it-go/journey_4-11min.mp3',
      'under_covers_opening': '/music/snippets/under-covers/opening_0-1m.mp3',
      'under_covers_vulnerability': '/music/snippets/under-covers/vulnerability_2-5min.mp3',
      'under_covers_warmth': '/music/snippets/under-covers/warmth_6-8min.mp3',
      'under_covers_loop': '/music/snippets/under-covers/contemplative_loop_8min.mp3',
    };

    audio.src = pathMap[snippetId] || '/music/snippets/that-gratitude/intro_0-30s.mp3';

    // Fade in
    audio.volume = 0;
    audio.play().catch(e => console.log('Autoplay blocked:', e));

    let elapsed = 0;
    const step = 50;
    const startVolume = dbToLinear(-20);
    const targetVolume = dbToLinear(state.volume);

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    fadeIntervalRef.current = setInterval(() => {
      elapsed += step;
      if (elapsed >= fadeInDuration) {
        audio.volume = targetVolume;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      } else {
        const progress = elapsed / fadeInDuration;
        audio.volume = startVolume + (targetVolume - startVolume) * progress;
      }
    }, step);

    setState(p => ({ ...p, isPlaying: true, currentSnippet: snippet }));
  }, [state.enabled, state.volume, dbToLinear]);

  const pause = useCallback(async (fadeOutDuration = 1000) => {
    const audio = audioRef.current;
    if (!audio) return;

    let elapsed = 0;
    const step = 50;
    const startVolume = audio.volume;

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    fadeIntervalRef.current = setInterval(() => {
      elapsed += step;
      if (elapsed >= fadeOutDuration) {
        audio.pause();
        audio.volume = dbToLinear(state.volume);
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        setState(p => ({ ...p, isPlaying: false }));
      } else {
        const progress = elapsed / fadeOutDuration;
        audio.volume = startVolume * (1 - progress);
      }
    }, step);
  }, [state.volume, dbToLinear]);

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
    localStorage.setItem('music_volume', clipped.toString());
  }, [dbToLinear]);

  const setSessionPhase = useCallback((phase: SessionPhase) => {
    setState(p => ({ ...p, sessionPhase: phase }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setState(p => ({ ...p, enabled }));
    localStorage.setItem('music_enabled', enabled.toString());
    if (!enabled && audioRef.current?.playing) {
      audioRef.current.pause();
    }
  }, []);

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
