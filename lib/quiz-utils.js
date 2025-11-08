/**
 * Quiz Utilities - Resilient recommendation logic with caching
 */

// Cache key for sessionStorage
const QUIZ_CACHE_KEY = 'tog-quiz-session';

/**
 * Save quiz state to sessionStorage
 */
export function saveQuizState(state) {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(QUIZ_CACHE_KEY, JSON.stringify({
      ...state,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to save quiz state:', e);
  }
}

/**
 * Load quiz state from sessionStorage
 */
export function loadQuizState() {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(QUIZ_CACHE_KEY);
    if (!cached) return null;
    
    const state = JSON.parse(cached);
    // Cache expires after 24 hours
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(QUIZ_CACHE_KEY);
      return null;
    }
    
    return state;
  } catch (e) {
    console.warn('Failed to load quiz state:', e);
    return null;
  }
}

/**
 * Clear quiz state
 */
export function clearQuizState() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(QUIZ_CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear quiz state:', e);
  }
}

/**
 * Generate heuristic recommendations when API fails
 * This ensures users ALWAYS get results
 */
export function getHeuristicRecommendations(answers, allProducts = []) {
  const { goal, texture, adventure } = answers;
  
  // Fallback recommendation mapping
  const goalMap = {
    'immune': ['elderberry', 'blue lotus', 'wellness', 'immune'],
    'gut': ['ginger', 'pineapple', 'digest', 'gut'],
    'energy': ['green', 'lemon', 'energy', 'vitality'],
    'skin': ['floral', 'golden', 'glow', 'radiant'],
    'calm': ['blue lotus', 'harmony', 'calm', 'balance']
  };
  
  const textureMap = {
    'gel': ['gel', 'moss'],
    'lemonade': ['lemonade', 'juice', 'zinger'],
    'shot': ['shot', 'wellness']
  };
  
  // Get matching keywords
  const goalKeywords = goalMap[goal] || [];
  const textureKeywords = textureMap[texture] || [];
  
  // Score products
  const scored = allProducts.map(product => {
    let score = 0;
    const name = product.name.toLowerCase();
    const description = (product.description || '').toLowerCase();
    const text = `${name} ${description}`;
    
    // Goal matching
    goalKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 3;
    });
    
    // Texture matching
    textureKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 2;
    });
    
    // Adventure level
    if (adventure === 'bold') {
      if (text.includes('bold') || text.includes('spicy') || text.includes('ginger')) score += 1;
    } else {
      if (text.includes('classic') || text.includes('mild') || text.includes('smooth')) score += 1;
    }
    
    return { ...product, score };
  });
  
  // Sort by score and return top 4
  return scored
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/**
 * Fetch recommendations with resilient error handling
 */
export async function fetchRecommendations(answers, allProducts = []) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch('/api/quiz/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers),
      signal: abortController.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Quiz API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.recommendations || data.recommendations.length === 0) {
      throw new Error('No recommendations returned');
    }
    
    return {
      success: true,
      recommendations: data.recommendations,
      source: 'api'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.warn('Quiz API failed, using heuristic recommendations:', error.message);
    
    // Return heuristic recommendations
    const heuristicRecs = getHeuristicRecommendations(answers, allProducts);
    
    return {
      success: false,
      recommendations: heuristicRecs,
      source: 'heuristic',
      error: error.message
    };
  }
}

/**
 * Submit quiz results (async, non-blocking)
 */
export async function submitQuizResults(customer, answers, recommendations) {
  try {
    const response = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        answers,
        recommendations: recommendations.map(r => r.id)
      })
    });
    
    if (!response.ok) {
      throw new Error(`Submit failed: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, quizId: data.quizId, emailSent: data.emailSent };
  } catch (error) {
    console.error('Quiz submission failed:', error);
    return { success: false, error: error.message };
  }
}
