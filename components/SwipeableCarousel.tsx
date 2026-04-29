'use client';

import { useState, useRef, useEffect } from 'react';
import { useSwipe, useSwipeNavigation } from '@/hooks/useSwipe';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface SwipeableCarouselProps {
  children: React.ReactNode[];
  className?: string;
  showDots?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  interval?: number;
}

/**
 * Mobile-optimized swipeable carousel
 * Supports touch gestures, auto-play, and dots/arrows navigation
 */
export function SwipeableCarousel({
  children,
  className = '',
  showDots = true,
  showArrows = true,
  autoPlay = false,
  interval = 5000,
}: SwipeableCarouselProps) {
  const itemCount = children.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>(null);

  const { handlers } = useSwipe({
    onSwipeLeft: () => {
      goToNext();
    },
    onSwipeRight: () => {
      goToPrev();
    },
    threshold: 50,
  });

  const goToNext = () => {
    setCurrentIndex((prev) => {
      const next = prev >= itemCount - 1 ? 0 : prev + 1;
      triggerHaptic(10);
      return next;
    });
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => {
      const next = prev <= 0 ? itemCount - 1 : prev - 1;
      triggerHaptic(10);
      return next;
    });
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    triggerHaptic(10);
  };

  // Auto-play
  useEffect(() => {
    if (autoPlay && itemCount > 1) {
      autoPlayRef.current = setInterval(goToNext, interval);
      return () => {
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      };
    }
  }, [autoPlay, interval, itemCount]);

  // Pause auto-play on touch
  useEffect(() => {
    if (isDragging && autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  }, [isDragging]);

  if (itemCount === 0) return null;

  return (
    <div className={`relative ${className}`} {...handlers}>
      {/* Slides container */}
      <div 
        ref={containerRef}
        className="overflow-hidden touch-pan-y"
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
      >
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {children.map((child, index) => (
            <div 
              key={index}
              className="w-full flex-shrink-0 px-2"
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Arrow navigation */}
      {showArrows && itemCount > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors touch-target hidden sm:flex items-center justify-center"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors touch-target hidden sm:flex items-center justify-center"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots navigation */}
      {showDots && itemCount > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {children.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 touch-target ${
                index === currentIndex 
                  ? 'bg-emerald-500 w-6' 
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}

      {/* Slide counter (mobile) */}
      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium sm:hidden">
        {currentIndex + 1} / {itemCount}
      </div>
    </div>
  );
}
