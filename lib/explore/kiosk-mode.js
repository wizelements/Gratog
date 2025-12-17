/**
 * Kiosk Mode Utilities
 * Features: Idle detection, auto-reset, fullscreen, wake lock
 */

import { logger } from '@/lib/logger';

class KioskMode {
  constructor() {
    this.enabled = false;
    this.idleTimeout = 180000; // 3 minutes
    this.idleTimer = null;
    this.lastInteraction = Date.now();
    this.onIdleCallback = null;
    this.wakeLock = null;
    
    // Load saved state
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kioskMode');
      this.enabled = saved === 'true';
    }
  }

  /**
   * Enable kiosk mode
   */
  async enable(options = {}) {
    if (typeof window === 'undefined') return;
    
    this.enabled = true;
    this.idleTimeout = options.idleTimeout || 180000;
    
    // Save to localStorage
    localStorage.setItem('kioskMode', 'true');
    
    // Request fullscreen
    if (options.fullscreen !== false) {
      await this.requestFullscreen();
    }
    
    // Prevent sleep
    await this.preventSleep();
    
    // Start idle detection
    this.startIdleDetection();
    
    console.log('🖥️ Kiosk mode enabled');
  }

  /**
   * Disable kiosk mode
   */
  async disable() {
    if (typeof window === 'undefined') return;
    
    this.enabled = false;
    localStorage.setItem('kioskMode', 'false');
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    
    // Release wake lock
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
    
    // Stop idle detection
    this.stopIdleDetection();
    
    console.log('🖥️ Kiosk mode disabled');
  }

  /**
   * Request fullscreen
   */
  async requestFullscreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  }

  /**
   * Prevent screen sleep using Wake Lock API
   */
  async preventSleep() {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return;
    }
    
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock activated');
      
      // Re-acquire on visibility change
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && this.enabled) {
          this.wakeLock = await navigator.wakeLock.request('screen');
        }
      });
    } catch (error) {
      console.warn('Wake Lock request failed:', error);
    }
  }

  /**
   * Start idle detection
   */
  startIdleDetection() {
    if (typeof window === 'undefined') return;
    
    const resetTimer = () => {
      this.lastInteraction = Date.now();
      this.resetIdleTimer();
    };
    
    // Listen for interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    
    // Start timer
    this.resetIdleTimer();
  }

  /**
   * Stop idle detection
   */
  stopIdleDetection() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Reset idle timer
   */
  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    this.idleTimer = setTimeout(() => {
      console.log('⏱️ Idle timeout triggered');
      if (this.onIdleCallback) {
        this.onIdleCallback();
      }
    }, this.idleTimeout);
  }

  /**
   * Set callback for idle event
   */
  onIdle(callback) {
    this.onIdleCallback = callback;
  }

  /**
   * Check if kiosk mode is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get time since last interaction
   */
  getIdleTime() {
    return Date.now() - this.lastInteraction;
  }
}

// Singleton instance
const kioskMode = new KioskMode();

export default kioskMode;
