/**
 * Adaptive Priority Calculator
 * 
 * Calculates message priority based on:
 * - Recency (newer = higher)
 * - Content signals (mentions, keywords)
 * - User behavior patterns
 * - Network conditions
 */

export interface PriorityFactors {
  recency: number;        // 0-100
  contentSignals: number; // 0-100
  networkQuality: number; // 0-100
  retryCount: number;     // Higher = more urgent
}

export function calculatePriority(content: string, factors?: Partial<PriorityFactors>): number {
  const baseFactors: PriorityFactors = {
    recency: 100,
    contentSignals: 50,
    networkQuality: 75,
    retryCount: 0,
    ...factors
  };

  // Recency score (decays over time)
  const ageInHours = factors?.recency ?? 0;
  const recencyScore = Math.max(0, 100 - (ageInHours * 2));

  // Content analysis
  let contentScore = 50;
  
  // Mentions increase priority
  const mentions = (content.match(/@\w+/g) || []).length;
  contentScore += mentions * 15;

  // Urgent keywords
  const urgentKeywords = ['URGENT', 'ASAP', 'EMERGENCY', 'IMPORTANT'];
  const hasUrgent = urgentKeywords.some(keyword => 
    content.toUpperCase().includes(keyword)
  );
  if (hasUrgent) contentScore += 30;

  // Question marks suggest need for response
  if (content.includes('?')) contentScore += 10;

  // Retry penalty (failed messages get higher priority)
  const retryBonus = (baseFactors.retryCount || 0) * 15;

  // Weighted average
  const priority = (
    recencyScore * 0.4 +
    Math.min(100, contentScore) * 0.4 +
    baseFactors.networkQuality * 0.1 +
    retryBonus * 0.1
  );

  return Math.max(0, Math.min(100, Math.round(priority)));
}

/**
 * ML-Ready: This can be replaced with TensorFlow.js model
 * that learns from user interaction patterns:
 * - Which messages user opens first
 * - Response time patterns
 * - Contact prioritization
 */
export async function calculatePriorityML(content: string): Promise<number> {
  // Placeholder for ML model
  // In M2, we'll train a small model on user behavior
  return calculatePriority(content);
}
