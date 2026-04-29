'use client';

import { useEffect, useCallback } from 'react';

// Haptic feedback patterns
export const HapticPatterns = {
  // Light tap - for buttons, selections
  LIGHT: 10,
  // Medium tap - for successful actions
  MEDIUM: 25,
  // Heavy tap - for important confirmations
  HEAVY: 50,
  // Success pattern - double light tap
  SUCCESS: [10, 50, 10],
  // Error pattern - single heavy vibration
  ERROR: 100,
  // Warning pattern - medium double
  WARNING: [25, 30, 25],
  // Selection change - subtle feedback
  SELECTION: 5,
} as const;

/**
 * Trigger haptic feedback using Vibration API
 * Falls back gracefully on unsupported devices
 */
export function triggerHaptic(
  pattern: number | number[] = HapticPatterns.MEDIUM
): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return; // Silent fallback
  }
  
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    // Ignore vibration errors
  }
}

/**
 * Hook for haptic feedback on element interactions
 */
export function useHapticFeedback() {
  const light = useCallback(() => triggerHaptic(HapticPatterns.LIGHT), []);
  const medium = useCallback(() => triggerHaptic(HapticPatterns.MEDIUM), []);
  const heavy = useCallback(() => triggerHaptic(HapticPatterns.HEAVY), []);
  const success = useCallback(() => triggerHaptic(HapticPatterns.SUCCESS), []);
  const error = useCallback(() => triggerHaptic(HapticPatterns.ERROR), []);
  const warning = useCallback(() => triggerHaptic(HapticPatterns.WARNING), []);
  const selection = useCallback(() => triggerHaptic(HapticPatterns.SELECTION), []);
  const custom = useCallback((pattern: number | number[]) => triggerHaptic(pattern), []);

  return {
    light,
    medium,
    heavy,
    success,
    error,
    warning,
    selection,
    custom,
    patterns: HapticPatterns,
  };
}

/**
 * Hook to add haptic feedback to button clicks
 */
export function useHapticButton(pattern: number | number[] = HapticPatterns.LIGHT) {
  const { custom } = useHapticFeedback();
  
  return {
    onClick: () => custom(pattern),
    onPointerDown: () => custom(pattern),
  };
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         'vibrate' in navigator && 
         typeof navigator.vibrate === 'function';
}
