'use client';

import { useState, useEffect, Suspense } from 'react';
import { useMusic } from '@/contexts/MusicContext';

function MusicControlsContent() {
  const music = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Component mounted
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Music Button - tap to play/pause, long press to expand */}
      <button
        onClick={() => {
          if (music.isPlaying) {
            music.pause();
          } else {
            music.setEnabled(true);
            music.play('that_gratitude_intro', 1000);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          music.isPlaying 
            ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
        aria-label={music.isPlaying ? 'Pause music' : 'Play music'}
        title="Tap to play/pause • Right-click for settings"
      >
        <span aria-hidden="true">{music.isPlaying ? '🎶' : '🎵'}</span>
      </button>
      
      {/* Settings gear button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-xs flex items-center justify-center shadow"
        aria-label="Music settings"
        aria-expanded={isExpanded}
        aria-controls="music-controls-panel"
      >
        ⚙
      </button>

      {/* Expanded Controls */}
      {isExpanded && (
        <div 
          id="music-controls-panel"
          className="absolute bottom-16 right-0 bg-white dark:bg-gray-900 rounded-lg shadow-xl p-4 w-64 border border-gray-200 dark:border-gray-700"
          role="region"
          aria-label="Music controls panel"
        >
          <div className="space-y-4">
            {/* Play/Pause Control */}
            <div className="flex items-center justify-between">
              <label htmlFor="music-play" className="text-sm font-medium">Music</label>
              <button
                id="music-play"
                onClick={() => {
                  if (music.isPlaying) {
                    music.pause();
                  } else {
                    music.setEnabled(true);
                    music.play('that_gratitude_intro', 1000);
                  }
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  music.isPlaying
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                aria-pressed={music.isPlaying}
              >
                {music.isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>

            {/* Volume Control */}
            {music.enabled && (
              <fieldset className="space-y-2 border-0 p-0">
                <legend className="text-sm font-medium">Volume</legend>
                <label htmlFor="volume-slider" className="sr-only">
                  Volume: {music.volume} dB
                </label>
                <input
                  id="volume-slider"
                  type="range"
                  min="-20"
                  max="0"
                  step="1"
                  value={music.volume}
                  onChange={e => music.setVolume(parseFloat(e.target.value))}
                  className="w-full"
                  aria-label="Volume control"
                  aria-valuenow={music.volume}
                  aria-valuemin={-20}
                  aria-valuemax={0}
                />
                <p className="text-xs text-gray-500" aria-live="polite">
                  {music.isPlaying ? <span aria-hidden="true">🎵</span> : null} {music.isPlaying ? 'Now playing' : 'Paused'}
                </p>
              </fieldset>
            )}

            {/* Info */}
            <div className="text-xs text-gray-600 dark:text-gray-400 border-t pt-2">
              <p className="font-semibold mb-1">Music Psychology</p>
              <ul className="space-y-1 text-left">
                <li>✓ Reduces stress</li>
                <li>✓ Enhances focus</li>
                <li>✓ Deepens gratitude</li>
                <li>✓ Improves retention</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MusicFallback() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        disabled 
        className="w-12 h-12 rounded-full bg-gray-300 text-gray-500 shadow-lg flex items-center justify-center text-lg"
        title="Music loading..."
        aria-label="Music unavailable"
      >
        🔄
      </button>
    </div>
  );
}

export function MusicControls() {
  return (
    <Suspense fallback={<MusicFallback />}>
      <MusicControlsContent />
    </Suspense>
  );
}
