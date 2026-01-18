'use client';

import { useState, useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext';

function MusicControlsContent() {
  const music = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Component mounted
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center transition-all"
        aria-label="Music controls toggle"
        aria-expanded={isExpanded}
        aria-controls="music-controls-panel"
      >
        <span aria-hidden="true">🎵</span>
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
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <label htmlFor="music-toggle" className="text-sm font-medium">Music</label>
              <button
                id="music-toggle"
                onClick={() => music.setEnabled(!music.enabled)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  music.enabled
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
                aria-pressed={music.enabled}
              >
                {music.enabled ? 'ON' : 'OFF'}
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

export function MusicControls() {
  try {
    return <MusicControlsContent />;
  } catch (error) {
    console.error('[MusicControls] Rendering failed:', error);
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          disabled 
          className="w-12 h-12 rounded-full bg-gray-300 text-gray-500 shadow-lg flex items-center justify-center text-lg"
          title="Music unavailable"
        >
          ❌
        </button>
      </div>
    );
  }
}
