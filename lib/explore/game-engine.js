/**
 * Game Engine
 * Shared game logic, scoring, timers, leaderboards
 */

import { logger } from '@/lib/logger';

class GameEngine {
  constructor() {
    this.activeGame = null;
    this.startTime = null;
    this.score = 0;
    this.highScores = this.loadHighScores();
  }

  /**
   * Start a game
   */
  startGame(gameId, initialScore = 0) {
    this.activeGame = gameId;
    this.startTime = Date.now();
    this.score = initialScore;
    
    console.log(`🎮 Game started: ${gameId}`);
    
    return {
      gameId,
      startTime: this.startTime
    };
  }

  /**
   * Update score
   */
  updateScore(points) {
    if (!this.activeGame) {
      console.warn('No active game');
      return;
    }
    
    this.score += points;
    return this.score;
  }

  /**
   * End game
   */
  endGame(gameId, finalScore) {
    if (this.activeGame !== gameId) {
      console.warn('Game mismatch');
      return null;
    }
    
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const score = finalScore !== undefined ? finalScore : this.score;
    
    // Check if high score
    const isHighScore = this.isHighScore(gameId, score);
    if (isHighScore) {
      this.saveHighScore(gameId, score);
    }
    
    const result = {
      gameId,
      score,
      duration,
      isHighScore,
      timestamp: endTime
    };
    
    // Reset
    this.activeGame = null;
    this.startTime = null;
    this.score = 0;
    
    console.log(`🏁 Game ended: ${gameId}`, result);
    
    return result;
  }

  /**
   * Get elapsed time
   */
  getElapsedTime() {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Check if score is a high score
   */
  isHighScore(gameId, score) {
    const currentHigh = this.getHighScore(gameId);
    return score > currentHigh;
  }

  /**
   * Get high score for a game
   */
  getHighScore(gameId) {
    return this.highScores[gameId] || 0;
  }

  /**
   * Save high score
   */
  saveHighScore(gameId, score) {
    this.highScores[gameId] = score;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameHighScores', JSON.stringify(this.highScores));
    }
    
    console.log(`🏆 New high score for ${gameId}: ${score}`);
  }

  /**
   * Load high scores from localStorage
   */
  loadHighScores() {
    if (typeof window === 'undefined') return {};
    
    try {
      const saved = localStorage.getItem('gameHighScores');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load high scores:', error);
      return {};
    }
  }

  /**
   * Get all high scores
   */
  getAllHighScores() {
    return { ...this.highScores };
  }

  /**
   * Clear high score for a game
   */
  clearHighScore(gameId) {
    delete this.highScores[gameId];
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameHighScores', JSON.stringify(this.highScores));
    }
  }

  /**
   * Clear all high scores
   */
  clearAllHighScores() {
    this.highScores = {};
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gameHighScores');
    }
  }
}

// Singleton instance
const gameEngine = new GameEngine();

export default gameEngine;
