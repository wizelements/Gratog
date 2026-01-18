'use client';

import { useState, useEffect } from 'react';
import { useMusic } from '@/contexts/MusicContext';

export function MusicControls() {
  const music = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center transition-all"
        title="Music Controls"
      >
        🎵
      </button>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-900 rounded-lg shadow-xl p-4 w-64 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Music</label>
              <button
                onClick={() => music.setEnabled(!music.enabled)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  music.enabled
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {music.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Volume Control */}
            {music.enabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Volume: {music.volume} dB
                </label>
                <input
                  type="range"
                  min="-20"
                  max="0"
                  step="1"
                  value={music.volume}
                  onChange={e => music.setVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  {music.isPlaying ? '🎵 Now playing' : 'Paused'}
                </p>
              </div>
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
