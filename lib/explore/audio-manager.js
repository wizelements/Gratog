/**
 * Audio Manager for Interactive Hub
 * Centralized audio control using Howler.js
 * Features: Preloading, volume control, mute toggle, spatial audio
 */

class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.muted = false;
    this.masterVolume = 1.0;
    this.backgroundMusic = null;
    
    // Load mute state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioMuted');
      this.muted = saved === 'true';
    }
  }

  /**
   * Preload a sound file
   */
  preload(soundId, url, options = {}) {
    if (typeof window === 'undefined') return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      try {
        // For now, use Audio API (will upgrade to Howler.js when installed)
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = options.volume || 1.0;
        
        audio.addEventListener('canplaythrough', () => {
          this.sounds.set(soundId, { audio, options });
          resolve();
        });
        
        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load sound: ${soundId}`, e);
          reject(e);
        });
      } catch (error) {
        console.warn(`Audio preload error: ${soundId}`, error);
        reject(error);
      }
    });
  }

  /**
   * Play a sound
   */
  play(soundId, options = {}) {
    if (this.muted || typeof window === 'undefined') return;
    
    const sound = this.sounds.get(soundId);
    if (!sound) {
      console.warn(`Sound not found: ${soundId}`);
      return;
    }

    try {
      const { audio } = sound;
      audio.currentTime = 0;
      audio.volume = (options.volume || 1.0) * this.masterVolume;
      audio.play().catch(e => console.warn('Play failed:', e));
    } catch (error) {
      console.warn('Play error:', error);
    }
  }

  /**
   * Stop a sound
   */
  stop(soundId) {
    const sound = this.sounds.get(soundId);
    if (sound) {
      sound.audio.pause();
      sound.audio.currentTime = 0;
    }
  }

  /**
   * Set global mute
   */
  setMute(muted) {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioMuted', String(muted));
    }
    
    if (muted && this.backgroundMusic) {
      this.backgroundMusic.audio.pause();
    }
  }

  /**
   * Set master volume (0.0 - 1.0)
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set volume for specific sound
   */
  setSoundVolume(soundId, volume) {
    const sound = this.sounds.get(soundId);
    if (sound) {
      sound.audio.volume = Math.max(0, Math.min(1, volume)) * this.masterVolume;
    }
  }

  /**
   * Play background music with loop
   */
  playBackgroundMusic(soundId, options = {}) {
    if (this.muted) return;
    
    const sound = this.sounds.get(soundId);
    if (!sound) return;

    this.backgroundMusic = sound;
    sound.audio.loop = true;
    sound.audio.volume = (options.volume || 0.3) * this.masterVolume;
    sound.audio.play().catch(e => console.warn('Background music play failed:', e));
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.audio.pause();
      this.backgroundMusic.audio.currentTime = 0;
      this.backgroundMusic = null;
    }
  }

  /**
   * Check if muted
   */
  isMuted() {
    return this.muted;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.sounds.forEach(sound => {
      sound.audio.pause();
      sound.audio.src = '';
    });
    this.sounds.clear();
  }
}

// Singleton instance
const audioManager = new AudioManager();

export default audioManager;
