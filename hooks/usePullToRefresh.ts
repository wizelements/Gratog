'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { triggerHaptic, HapticPatterns } from '@/lib/haptics';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  resistance?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullProgress: number;
  isRefreshing: boolean;
  canRelease: boolean;
}

/**
 * Hook for pull-to-refresh functionality on mobile
 * Adds haptic feedback when threshold is reached
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  resistance = 0.8,
  disabled = false,
}: PullToRefreshOptions): {
  state: PullToRefreshState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  style: React.CSSProperties;
} {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  
  const startYRef = useRef(0);
  const startScrollRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    startScrollRef.current = window.scrollY;
    setHasTriggeredHaptic(false);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - startYRef.current;
    
    // Only activate if at top of page and pulling down
    if (window.scrollY <= 0 && deltaY > 0) {
      if (!isPulling) {
        setIsPulling(true);
      }
      
      // Apply resistance to pull
      const resistedDistance = Math.min(deltaY * resistance, maxPull);
      setPullDistance(resistedDistance);
      
      // Haptic feedback when threshold reached
      if (resistedDistance >= threshold && !hasTriggeredHaptic) {
        triggerHaptic(HapticPatterns.MEDIUM);
        setHasTriggeredHaptic(true);
      }
    }
  }, [disabled, isRefreshing, isPulling, threshold, maxPull, resistance, hasTriggeredHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    // Trigger refresh if pulled past threshold
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      triggerHaptic(HapticPatterns.SUCCESS);
      
      try {
        await onRefresh();
      } catch (error) {
        triggerHaptic(HapticPatterns.ERROR);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setHasTriggeredHaptic(false);
      }
    } else {
      // Snap back if not pulled enough
      setPullDistance(0);
      triggerHaptic(HapticPatterns.LIGHT);
    }
  }, [isPulling, disabled, pullDistance, threshold, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const canRelease = pullDistance >= threshold;

  return {
    state: {
      isPulling,
      pullProgress,
      isRefreshing,
      canRelease,
    },
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    style: {
      transform: `translateY(${pullDistance}px)`,
      transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: isPulling ? 'transform' : 'auto',
    },
  };
}

/**
 * Pull to refresh visual indicator component
 */
export function PullIndicator({ 
  progress, 
  isRefreshing, 
  canRelease 
}: { 
  progress: number;
  isRefreshing: boolean;
  canRelease: boolean;
}) {
  const rotate = progress * 180;
  
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center pointer-events-none"
      style={{
        transform: `translateY(${-50 + (progress * 80)}px)`,
        opacity: Math.max(progress, 0.3),
        transition: 'opacity 0.2s',
      }}
    >
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        ${canRelease ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
        transition-colors duration-200
      `}>
        <svg
          className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${rotate}deg)` }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isRefreshing 
                ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                : "M19 14l-7 7m0 0l-7-7m7 7V3"
              }
            />
        </svg>
        <span className="text-sm font-medium">
          {isRefreshing ? 'Refreshing...' : canRelease ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}
