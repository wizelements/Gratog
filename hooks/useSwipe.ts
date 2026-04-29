'use client';

import { useState, useCallback, useRef } from 'react';
import { triggerHaptic, HapticPatterns } from '@/lib/haptics';

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
}

interface SwipeOptions {
  threshold?: number;
  velocityThreshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipe?: (gesture: SwipeGesture) => void;
  hapticOnSuccess?: boolean;
}

/**
 * Hook for detecting swipe gestures
 * Perfect for mobile navigation between tabs/cards
 */
export function useSwipe({
  threshold = 50,
  velocityThreshold = 0.3,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onSwipe,
  hapticOnSuccess = true,
}: SwipeOptions) {
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = Date.now();
    setIsSwiping(true);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();
    
    const deltaX = endX - startXRef.current;
    const deltaY = endY - startYRef.current;
    const deltaTime = endTime - startTimeRef.current;
    
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;
    
    // Determine dominant direction
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const distance = isHorizontal ? Math.abs(deltaX) : Math.abs(deltaY);
    const velocity = isHorizontal ? velocityX : velocityY;
    
    // Check if swipe meets threshold
    if (distance >= threshold || velocity >= velocityThreshold) {
      let direction: SwipeGesture['direction'] = null;
      
      if (isHorizontal) {
        if (deltaX > 0) {
          direction = 'right';
          onSwipeRight?.();
        } else {
          direction = 'left';
          onSwipeLeft?.();
        }
      } else {
        if (deltaY > 0) {
          direction = 'down';
          onSwipeDown?.();
        } else {
          direction = 'up';
          onSwipeUp?.();
        }
      }
      
      const gesture: SwipeGesture = {
        direction,
        distance,
        velocity: isHorizontal ? velocityX : velocityY,
      };
      
      onSwipe?.(gesture);
      
      if (hapticOnSuccess) {
        triggerHaptic(HapticPatterns.LIGHT);
      }
    }
    
    setIsSwiping(false);
  }, [isSwiping, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipe, hapticOnSuccess]);

  return {
    isSwiping,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for carousel/product card swipe navigation
 */
export function useSwipeNavigation({
  itemCount,
  onChange,
  loop = false,
}: {
  itemCount: number;
  onChange: (index: number) => void;
  loop?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = loop 
        ? (prev + 1) % itemCount 
        : Math.min(prev + 1, itemCount - 1);
      onChange(next);
      return next;
    });
    triggerHaptic(HapticPatterns.LIGHT);
  }, [itemCount, loop, onChange]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = loop 
        ? (prev - 1 + itemCount) % itemCount 
        : Math.max(prev - 1, 0);
      onChange(next);
      return next;
    });
    triggerHaptic(HapticPatterns.LIGHT);
  }, [itemCount, loop, onChange]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
    threshold: 60,
    hapticOnSuccess: false, // We handle haptic in navigation
  });

  return {
    currentIndex,
    goToNext,
    goToPrev,
    canGoNext: loop || currentIndex < itemCount - 1,
    canGoPrev: loop || currentIndex > 0,
    ...swipeHandlers,
  };
}

/**
 * Hook for swipe to dismiss (for modals, cards, etc)
 */
export function useSwipeToDismiss({
  onDismiss,
  direction = 'down',
  threshold = 100,
}: {
  onDismiss: () => void;
  direction?: 'down' | 'up' | 'left' | 'right';
  threshold?: number;
}) {
  const [dismissProgress, setDismissProgress] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });

  const getSwipeHandler = (currentX: number, currentY: number) => {
    const deltaX = currentX - startRef.current.x;
    const deltaY = currentY - startRef.current.y;
    
    let progress = 0;
    let shouldTrigger = false;
    
    switch (direction) {
      case 'down':
        progress = Math.max(0, deltaY) / threshold;
        shouldTrigger = deltaY >= threshold;
        break;
      case 'up':
        progress = Math.max(0, -deltaY) / threshold;
        shouldTrigger = -deltaY >= threshold;
        break;
      case 'right':
        progress = Math.max(0, deltaX) / threshold;
        shouldTrigger = deltaX >= threshold;
        break;
      case 'left':
        progress = Math.max(0, -deltaX) / threshold;
        shouldTrigger = -deltaX >= threshold;
        break;
    }
    
    return { progress: Math.min(progress, 1), shouldTrigger };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDismissing(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const { progress } = getSwipeHandler(touch.clientX, touch.clientY);
    setDismissProgress(progress);
  }, [direction, threshold]);

  const handleTouchEnd = useCallback(() => {
    setIsDismissing(false);
    setDismissProgress(0);
    
    // Check final position
    const { shouldTrigger } = getSwipeHandler(
      startRef.current.x + (direction === 'left' || direction === 'right' ? threshold : 0),
      startRef.current.y + (direction === 'up' || direction === 'down' ? threshold : 0)
    );
    
    if (shouldTrigger) {
      triggerHaptic(HapticPatterns.MEDIUM);
      onDismiss();
    }
  }, [direction, threshold, onDismiss]);

  const transform = (() => {
    const distance = dismissProgress * threshold;
    switch (direction) {
      case 'down': return `translateY(${distance}px)`;
      case 'up': return `translateY(-${distance}px)`;
      case 'right': return `translateX(${distance}px)`;
      case 'left': return `translateX(-${distance}px)`;
      default: return 'none';
    }
  })();

  return {
    isDismissing,
    dismissProgress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    style: {
      transform,
      transition: isDismissing ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: 1 - (dismissProgress * 0.3),
    },
  };
}
