'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Accessibility, Plus, Minus, Eye, EyeOff } from 'lucide-react';

export default function AccessibilityControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const savedFontSize = localStorage.getItem('a11y-font-size');
    const savedContrast = localStorage.getItem('a11y-high-contrast');

    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize));
      document.documentElement.style.fontSize = `${savedFontSize}%`;
    }
    if (savedContrast === 'true') {
      setHighContrast(true);
      document.documentElement.classList.add('high-contrast');
    }
  }, []);

  const adjustFontSize = (delta) => {
    const newSize = Math.min(Math.max(fontSize + delta, 75), 150);
    setFontSize(newSize);
    localStorage.setItem('a11y-font-size', newSize);
    document.documentElement.style.fontSize = `${newSize}%`;
  };

  const toggleHighContrast = () => {
    const newContrast = !highContrast;
    setHighContrast(newContrast);
    localStorage.setItem('a11y-high-contrast', newContrast);

    if (newContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        variant="outline"
        className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white gap-2"
        aria-label="Accessibility options"
        aria-expanded={isOpen}
        title="Accessibility Settings"
      >
        <Accessibility className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">A11y</span>
      </Button>

      {/* Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-xl p-4 z-50 min-w-[280px]"
          role="region"
          aria-label="Accessibility controls"
        >
          {/* Font Size Control */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Text Size
            </label>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => adjustFontSize(-10)}
                size="sm"
                variant="outline"
                className="p-0 w-8 h-8"
                aria-label="Decrease font size"
              >
                <Minus className="h-3 w-3" />
              </Button>

              <div className="flex-1 text-center">
                <span className="text-sm font-medium text-gray-700">
                  {fontSize}%
                </span>
                <div className="h-1 bg-gray-200 rounded mt-1">
                  <div
                    className="h-full bg-[#D4AF37] rounded transition-all"
                    style={{
                      width: `${((fontSize - 75) / (150 - 75)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <Button
                onClick={() => adjustFontSize(10)}
                size="sm"
                variant="outline"
                className="p-0 w-8 h-8"
                aria-label="Increase font size"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Current: {fontSize}% (75-150% available)
            </p>
          </div>

          {/* High Contrast Toggle */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={toggleHighContrast}
                className="w-4 h-4 cursor-pointer"
                aria-label="Toggle high contrast mode"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900 group-hover:text-[#D4AF37]">
                  High Contrast
                </span>
                <p className="text-xs text-gray-500">
                  {highContrast ? 'Enabled' : 'Easier on eyes'}
                </p>
              </div>
              {highContrast && (
                <Eye className="h-4 w-4 text-[#D4AF37] ml-auto" />
              )}
            </label>
          </div>

          {/* Reset Button */}
          <Button
            onClick={() => {
              setFontSize(100);
              setHighContrast(false);
              localStorage.removeItem('a11y-font-size');
              localStorage.removeItem('a11y-high-contrast');
              document.documentElement.style.fontSize = '100%';
              document.documentElement.classList.remove('high-contrast');
            }}
            variant="outline"
            size="sm"
            className="w-full mt-4 text-xs"
          >
            Reset to Default
          </Button>

          {/* Help Text */}
          <p className="text-xs text-gray-600 mt-4 leading-relaxed">
            Your preferences are saved locally. Close this panel anytime and
            click the button again to adjust.
          </p>
        </div>
      )}
    </div>
  );
}
