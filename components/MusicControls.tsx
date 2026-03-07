'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMusic } from '@/contexts/MusicContext';

interface PanelPosition {
  bottom: number;
  left: number;
  maxHeight: number;
}

const PANEL_GAP = 12;
const SAFE_MARGIN = 16;

// The three songs with their psychological profiles
const TRACKS = [
  {
    id: 'that_gratitude_intro',
    name: 'That Gratitude',
    artist: 'Taste of Gratitude',
    emoji: '🧘',
    description: 'Introspective & calming',
    psychology: 'Alpha waves • Parasympathetic',
    neuroBenefit: 'Reduces cortisol, promotes calm focus',
    duration: '9:42',
    gradient: 'from-violet-500 via-purple-500 to-indigo-600',
    bgGradient: 'from-violet-950/95 via-purple-950/90 to-indigo-950/95',
    accent: 'violet',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'cant_let_it_go_journey',
    name: "Can't Let It Go",
    artist: 'Taste of Gratitude',
    emoji: '🦋',
    description: 'Transformation journey',
    psychology: 'Beta → Alpha • Dopamine',
    neuroBenefit: 'Emotional release & motivation',
    duration: '11:23',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    bgGradient: 'from-amber-950/95 via-orange-950/90 to-rose-950/95',
    accent: 'amber',
    glowColor: 'rgba(251, 146, 60, 0.4)',
  },
  {
    id: 'under_covers_opening',
    name: 'Under the Covers',
    artist: 'Taste of Gratitude',
    emoji: '💫',
    description: 'Intimate & vulnerable',
    psychology: 'Oxytocin • Mirror neurons',
    neuroBenefit: 'Connection & emotional warmth',
    duration: '12:15',
    gradient: 'from-rose-400 via-pink-500 to-fuchsia-500',
    bgGradient: 'from-rose-950/95 via-pink-950/90 to-fuchsia-950/95',
    accent: 'rose',
    glowColor: 'rgba(244, 114, 182, 0.4)',
  },
] as const;

// Waveform visualizer component
function WaveformVisualizer({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${color}`}
          style={{
            height: isPlaying ? `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%` : '8%',
            opacity: isPlaying ? 0.6 + Math.random() * 0.4 : 0.3,
            animationDelay: `${i * 50}ms`,
            animation: isPlaying ? `waveform 0.8s ease-in-out ${i * 50}ms infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function MusicControlsContent() {
  const music = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const currentTrack = TRACKS[selectedTrackIndex];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isExpanded || !buttonRef.current) {
      setPanelPosition(null);
      return;
    }

    const calculatePanelPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const panelBottom = viewportHeight - buttonRect.top + PANEL_GAP;
      const panelWidth = Math.min(340, viewportWidth - 32);
      let panelLeft = buttonRect.left;
      
      if (panelLeft + panelWidth > viewportWidth - SAFE_MARGIN) {
        panelLeft = viewportWidth - panelWidth - SAFE_MARGIN;
      }
      panelLeft = Math.max(SAFE_MARGIN, panelLeft);
      const maxHeight = viewportHeight - panelBottom - SAFE_MARGIN;

      setPanelPosition({
        bottom: panelBottom,
        left: panelLeft,
        maxHeight: Math.max(400, maxHeight),
      });
    };

    calculatePanelPosition();
    window.addEventListener('resize', calculatePanelPosition);
    window.addEventListener('scroll', calculatePanelPosition);

    return () => {
      window.removeEventListener('resize', calculatePanelPosition);
      window.removeEventListener('scroll', calculatePanelPosition);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const panel = document.getElementById('music-controls-panel');
      const container = containerRef.current;
      
      if (panel && !panel.contains(target) && container && !container.contains(target)) {
        setIsExpanded(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchend', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const handleOverlayChange = () => {
      if (document.body.getAttribute('data-overlay-open') === 'true') {
        setIsExpanded(false);
      }
    };

    const observer = new MutationObserver(handleOverlayChange);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-overlay-open'],
    });
    handleOverlayChange();

    return () => observer.disconnect();
  }, []);

  const handleTogglePlay = () => {
    if (music.isPlaying) {
      void music.pause();
      return;
    }
    void music.play(currentTrack.id, 1000).catch((error) => {
      console.error('[MusicControls] Play error:', error.name, error.message);
    });
    music.setEnabled(true);
  };

  const handleTrackSelect = (index: number) => {
    setSelectedTrackIndex(index);
    const track = TRACKS[index];
    void music.play(track.id, 500).catch((error) => {
      console.error('[MusicControls] Track switch error:', error.name, error.message);
    });
    music.setEnabled(true);
  };

  const handlePrevTrack = () => {
    const newIndex = selectedTrackIndex === 0 ? TRACKS.length - 1 : selectedTrackIndex - 1;
    handleTrackSelect(newIndex);
  };

  const handleNextTrack = () => {
    const newIndex = selectedTrackIndex === TRACKS.length - 1 ? 0 : selectedTrackIndex + 1;
    handleTrackSelect(newIndex);
  };

  return (
    <div 
      ref={containerRef}
      className="fixed z-[9999] bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 sm:bottom-6 sm:left-6"
      data-widget="music-controls"
    >
      {/* Floating Music Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          relative w-14 h-14 rounded-2xl 
          flex items-center justify-center 
          transition-all duration-500 ease-out
          text-2xl select-none
          touch-manipulation
          ${music.isPlaying 
            ? `bg-gradient-to-br ${currentTrack.gradient} shadow-2xl shadow-${currentTrack.accent}-500/40` 
            : 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl'
          }
          text-white
          border border-white/20
          backdrop-blur-xl
          hover:scale-105 active:scale-95
        `}
        aria-label="Open music player"
      >
        {music.isPlaying ? (
          <>
            {/* Animated equalizer bars */}
            <div className="flex items-end gap-0.5 h-6">
              <span className="w-1 bg-white rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0ms' }} />
              <span className="w-1 bg-white rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
              <span className="w-1 bg-white rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '300ms' }} />
              <span className="w-1 bg-white rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '450ms' }} />
            </div>
            {/* Glow ring */}
            <span className="absolute inset-[-3px] rounded-2xl border-2 border-white/30 animate-pulse pointer-events-none" />
          </>
        ) : (
          <span className="drop-shadow-lg">🎵</span>
        )}
      </button>

      {/* Premium Music Player Panel */}
      {isExpanded && isMounted && panelPosition && createPortal(
        <div 
          id="music-controls-panel"
          data-widget="music-controls-panel"
          className="fixed rounded-3xl overflow-hidden z-[10000] animate-scale-in"
          style={{
            bottom: panelPosition.bottom,
            left: panelPosition.left,
            width: 360,
            maxHeight: panelPosition.maxHeight,
            boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 80px ${currentTrack.glowColor}`,
          }}
          role="dialog"
          aria-label="Music player"
        >
          {/* Glassmorphism background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${currentTrack.bgGradient}`} />
          <div className="absolute inset-0 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Content wrapper */}
          <div className="relative">
            {/* Hero section with waveform */}
            <div className={`relative h-44 bg-gradient-to-br ${currentTrack.gradient} overflow-hidden`}>
              {/* Animated mesh gradient background */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.3)_0%,transparent_50%)]" />
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,0,0,0.4)_0%,transparent_50%)]" />
              </div>
              
              {/* Waveform visualizer */}
              <div className="absolute inset-x-0 bottom-0 px-6">
                <WaveformVisualizer isPlaying={music.isPlaying} color="bg-white" />
              </div>
              
              {/* Floating emoji with glow */}
              <div className="absolute inset-0 flex items-center justify-center pb-8">
                <div className="relative">
                  <span 
                    className={`text-7xl drop-shadow-2xl ${music.isPlaying ? 'animate-[float_3s_ease-in-out_infinite]' : ''}`}
                    style={{ 
                      filter: music.isPlaying ? 'drop-shadow(0 0 30px rgba(255,255,255,0.5))' : 'none',
                    }}
                  >
                    {currentTrack.emoji}
                  </span>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all border border-white/10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Playing indicator badge */}
              {music.isPlaying && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-xs font-medium text-white">Now Playing</span>
                </div>
              )}
            </div>

            {/* Track Info & Controls */}
            <div className="relative p-6 space-y-5">
              {/* Track Title with neuro badge */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">{currentTrack.name}</h3>
                <p className="text-sm text-white/50">{currentTrack.artist}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-xs">🧠</span>
                  <span className="text-xs text-white/60">{currentTrack.neuroBenefit}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className={`h-full bg-gradient-to-r ${currentTrack.gradient} rounded-full transition-all duration-1000 relative`}
                    style={{ width: music.isPlaying ? '45%' : '0%' }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-white/50" />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-white/40 font-medium">
                  <span>{music.isPlaying ? '4:21' : '0:00'}</span>
                  <span>{currentTrack.duration}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-5">
                {/* Previous */}
                <button
                  onClick={handlePrevTrack}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 border border-white/5"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>

                {/* Play/Pause - larger and more prominent */}
                <button
                  onClick={handleTogglePlay}
                  className={`
                    w-18 h-18 rounded-full 
                    bg-gradient-to-br ${currentTrack.gradient}
                    flex items-center justify-center 
                    text-white
                    transition-all duration-300
                    hover:scale-110 active:scale-95
                    border border-white/20
                  `}
                  style={{
                    width: '72px',
                    height: '72px',
                    boxShadow: `0 10px 40px ${currentTrack.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  }}
                >
                  {music.isPlaying ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={handleNextTrack}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95 border border-white/5"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </div>

              {/* Volume Control - sleeker design */}
              <div className="flex items-center gap-4 px-2">
                <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 9v6h4l5 5V4L9 9H5zm11.5 3A4.5 4.5 0 0014 8.14v7.72c1.48-.73 2.5-2.25 2.5-3.86z"/>
                </svg>
                <div className="flex-1 relative group">
                  <div className="absolute inset-0 rounded-full bg-white/5" />
                  <input
                    type="range"
                    min="-20"
                    max="0"
                    step="1"
                    value={music.volume}
                    onChange={e => music.setVolume(parseFloat(e.target.value))}
                    className={`w-full h-2 bg-transparent rounded-full appearance-none cursor-pointer relative z-10
                      [&::-webkit-slider-runnable-track]:rounded-full
                      [&::-webkit-slider-runnable-track]:bg-gradient-to-r
                      [&::-webkit-slider-runnable-track]:${currentTrack.gradient}
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-black/30
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:duration-200
                      [&::-webkit-slider-thumb]:hover:scale-125
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-white/50
                    `}
                  />
                </div>
                <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.14v7.72c1.48-.73 2.5-2.25 2.5-3.86zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </div>

              {/* Track Selection - Premium Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Choose Your Vibe</p>
                  <span className="text-xs text-white/30">{TRACKS.length} tracks</span>
                </div>
                <div className="space-y-2">
                  {TRACKS.map((track, index) => (
                    <button
                      key={track.id}
                      onClick={() => handleTrackSelect(index)}
                      className={`
                        w-full flex items-center gap-4 p-3 rounded-2xl
                        transition-all duration-300 group
                        ${selectedTrackIndex === index
                          ? 'bg-white/15 border-white/20'
                          : 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/10'
                        }
                        border backdrop-blur-sm
                      `}
                      style={selectedTrackIndex === index ? {
                        boxShadow: `0 4px 20px ${track.glowColor}`,
                      } : {}}
                    >
                      {/* Track icon with gradient background */}
                      <div className={`
                        relative w-12 h-12 rounded-xl flex items-center justify-center
                        bg-gradient-to-br ${track.gradient}
                        transition-transform duration-300 group-hover:scale-105
                        ${selectedTrackIndex === index ? 'shadow-lg' : ''}
                      `}>
                        <span className="text-2xl">{track.emoji}</span>
                        {selectedTrackIndex === index && music.isPlaying && (
                          <div className="absolute inset-0 rounded-xl border-2 border-white/40 animate-pulse" />
                        )}
                      </div>
                      
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-sm font-semibold truncate ${selectedTrackIndex === index ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                          {track.name}
                        </p>
                        <p className={`text-xs truncate ${selectedTrackIndex === index ? 'text-white/60' : 'text-white/40'}`}>
                          {track.psychology}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${selectedTrackIndex === index ? 'text-white/60' : 'text-white/30'}`}>
                          {track.duration}
                        </span>
                        {selectedTrackIndex === index && music.isPlaying ? (
                          <div className="flex items-end gap-0.5 h-5 w-5">
                            <span className="w-1 bg-white rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '40%' }} />
                            <span className="w-1 bg-white rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '150ms' }} />
                            <span className="w-1 bg-white rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          <svg className={`w-5 h-5 transition-opacity ${selectedTrackIndex === index ? 'text-white/60' : 'text-white/20 opacity-0 group-hover:opacity-100'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer with branding */}
              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🌿</span>
                  <p className="text-xs text-white/30 font-medium">
                    Music crafted for your wellness journey
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes equalizer {
          0%, 100% { height: 40%; }
          50% { height: 100%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }
        @keyframes waveform {
          0% { height: 15%; }
          100% { height: 85%; }
        }
      `}</style>
    </div>
  );
}

export function MusicControls() {
  return <MusicControlsContent />;
}
