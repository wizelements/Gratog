/**
 * Adaptive Recommendations Engine
 * Intelligent product suggestions based on ingredients, browsing, and preferences
 */

import { connectToDatabase } from './db-optimized';
import { extractIngredients, INGREDIENT_DATABASE } from './ingredient-taxonomy';
import { logger } from '@/lib/logger';

/**
 * Get personalized recommendations based on user behavior
 */
export async function getPersonalizedRecommendations({
  viewedProducts = [],
  cartItems = [],
  preferences = {},
  limit = 6
}) {
  try {
    const { db } = await connectToDatabase();
    
    // Analyze user's ingredient preferences from viewed/cart products
    const ingredientPreferences = analyzeIngredientPreferences(viewedProducts, cartItems);
    
    // Get all products
    const allProducts = await db.collection('unified_products')
      .find({})
      .toArray();
    
    // Score each product based on preferences
    const scoredProducts = allProducts.map(product => ({
      ...product,
      score: calculateRecommendationScore(product, ingredientPreferences, viewedProducts, cartItems, preferences)
    }));
    
    // Filter out already viewed/in cart
    const viewedIds = new Set(viewedProducts.map(p => p.id));
    const cartIds = new Set(cartItems.map(p => p.id));
    
    const recommendations = scoredProducts
      .filter(p => !viewedIds.has(p.id) && !cartIds.has(p.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return {
      recommendations,
      reasoning: generateReasoningText(recommendations[0], ingredientPreferences),
      ingredientMatch: ingredientPreferences
    };
  } catch (error) {
    logger.error('Recommendations', 'Get personalized recommendations failed', error);
    return { recommendations: [], reasoning: '', ingredientMatch: {} };
  }
}

/**
 * Analyze ingredient preferences from user behavior
 */
function analyzeIngredientPreferences(viewedProducts, cartItems) {
  const preferences = {};
  
  // Weight cart items higher than viewed
  const allProducts = [
    ...viewedProducts.map(p => ({ ...p, weight: 1 })),
    ...cartItems.map(p => ({ ...p, weight: 3 }))
  ];
  
  allProducts.forEach(({ ingredients, weight }) => {
    if (!ingredients) return;
    
    ingredients.forEach(ingredient => {
      const name = ingredient.name || ingredient;
      preferences[name] = (preferences[name] || 0) + weight;
    });
  });
  
  return preferences;
}

/**
 * Calculate recommendation score
 */
function calculateRecommendationScore(product, ingredientPreferences, viewedProducts, cartItems, userPreferences) {
  let score = 0;
  
  // Ingredient matching (0-50 points)
  if (product.ingredients && product.ingredients.length > 0) {
    product.ingredients.forEach(ingredient => {
      const prefScore = ingredientPreferences[ingredient.name] || 0;
      score += prefScore * 10; // 10 points per preference match
    });
  }
  
  // Category preferences (0-20 points)
  if (userPreferences.favoriteCategory && product.intelligentCategory === userPreferences.favoriteCategory) {
    score += 20;
  }
  
  // Tag matching (0-15 points)
  if (userPreferences.tags && product.tags) {
    const matchingTags = product.tags.filter(tag => userPreferences.tags.includes(tag));
    score += matchingTags.length * 5;
  }
  
  // Price range preference (0-10 points)
  if (userPreferences.priceRange) {
    const [min, max] = userPreferences.priceRange;
    if (product.price >= min && product.price <= max) {
      score += 10;
    }
  }
  
  // Popularity boost (0-10 points) - products with more benefits
  const benefitCount = product.ingredients?.reduce((acc, ing) => acc + (ing.benefits?.length || 0), 0) || 0;
  score += Math.min(benefitCount, 10);
  
  // Recency boost (0-5 points) - newer synced products
  if (product.syncedAt) {
    const daysSinceSync = (Date.now() - new Date(product.syncedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceSync < 7) {
      score += 5;
    }
  }
  
  return score;
}

/**
 * Generate reasoning text for recommendation
 */
function generateReasoningText(topRecommendation, ingredientPreferences) {
  if (!topRecommendation || !topRecommendation.ingredients) {
    return 'Based on our premium wellness collection';
  }
  
  const topIngredient = Object.entries(ingredientPreferences)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (!topIngredient) {
    return `Try ${topRecommendation.name} for ${topRecommendation.categoryData?.description || 'wellness'}`;
  }
  
  const [ingredientName] = topIngredient;
  return `Because you love ${ingredientName}, you'll enjoy ${topRecommendation.name}`;
}

/**
 * Get ingredient-based suggestions
 */
export async function getIngredientSuggestions(ingredientName, limit = 4) {
  try {
    const { db } = await connectToDatabase();
    
    const products = await db.collection('unified_products')
      .find({
        'ingredients.name': ingredientName
      })
      .limit(limit)
      .toArray();
    
    const ingredientData = INGREDIENT_DATABASE[ingredientName] || {};
    
    return {
      ingredient: ingredientName,
      icon: ingredientData.icon,
      benefits: ingredientData.benefits,
      products,
      tagline: `Products with ${ingredientName} ${ingredientData.icon || ''}`
    };
  } catch (error) {
    logger.error('Recommendations', 'Get ingredient suggestions failed', error);
    return { ingredient: ingredientName, products: [] };
  }
}

/**
 * Get "Complete Your Wellness" suggestions (complementary ingredients)
 */
export async function getComplementarySuggestions(cartItems, limit = 3) {
  try {
    const { db } = await connectToDatabase();
    
    // Analyze ingredients in cart
    const cartIngredients = new Set();
    cartItems.forEach(item => {
      if (item.ingredients) {
        item.ingredients.forEach(ing => cartIngredients.add(ing.name));
      }
    });
    
    // Define complementary ingredient pairs
    const complementaryMap = {
      'sea moss': ['turmeric', 'ginger', 'lemon'],
      'turmeric': ['cayenne', 'ginger', 'honey'],
      'ginger': ['lemon', 'honey', 'agave'],
      'blue lotus': ['basil', 'honey'],
      'lemon': ['chlorophyll', 'agave', 'ginger']
    };
    
    // Find complementary ingredients not in cart
    const suggestions = [];
    for (const ingredient of cartIngredients) {
      const complements = complementaryMap[ingredient] || [];
      complements.forEach(comp => {
        if (!cartIngredients.has(comp)) {
          suggestions.push(comp);
        }
      });
    }
    
    // Get products with complementary ingredients
    if (suggestions.length === 0) {
      return { suggestions: [], message: 'Your wellness journey is complete!' };
    }
    
    const products = await db.collection('unified_products')
      .find({
        'ingredients.name': { $in: suggestions }
      })
      .limit(limit)
      .toArray();
    
    return {
      suggestions: suggestions.slice(0, 3),
      products,
      message: `Complete your wellness with ${suggestions[0]}`
    };
  } catch (error) {
    logger.error('Recommendations', 'Get complementary suggestions failed', error);
    return { suggestions: [], products: [] };
  }
}

/**
 * Get trending products by category
 */
export async function getTrendingByCategory(category, days = 7, limit = 5) {
  try {
    const { db } = await connectToDatabase();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get view counts from analytics
    const trending = await db.collection('unified_analytics').aggregate([
      {
        $match: {
          type: 'product_view',
          'data.category': category,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$data.productId',
          views: { $sum: 1 },
          productName: { $first: '$data.productName' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: limit }
    ]).toArray();
    
    // Enrich with full product data
    const productIds = trending.map(t => t._id);
    const products = await db.collection('unified_products')
      .find({ id: { $in: productIds } })
      .toArray();
    
    // Merge view counts
    const enrichedProducts = products.map(product => {
      const viewData = trending.find(t => t._id === product.id);
      return {
        ...product,
        trendingViews: viewData?.views || 0
      };
    });
    
    return {
      category,
      trending: enrichedProducts.sort((a, b) => b.trendingViews - a.trendingViews)
    };
  } catch (error) {
    logger.error('Recommendations', 'Get trending by category failed', error);
    return { category, trending: [] };
  }
}

/**
 * Smart search with ingredient intelligence
 */
export async function smartSearch(query, filters = {}) {
  try {
    const { db } = await connectToDatabase();
    
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
        { 'ingredients.name': { $regex: query, $options: 'i' } },
        { benefitStory: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Add filters
    if (filters.category) {
      searchQuery.intelligentCategory = filters.category;
    }
    
    if (filters.minPrice || filters.maxPrice) {
      searchQuery.price = {};
      if (filters.minPrice) searchQuery.price.$gte = filters.minPrice;
      if (filters.maxPrice) searchQuery.price.$lte = filters.maxPrice;
    }
    
    const results = await db.collection('unified_products')
      .find(searchQuery)
      .limit(20)
      .toArray();
    
    // Score results by relevance
    const scoredResults = results.map(product => {
      let relevance = 0;
      
      if (product.name.toLowerCase().includes(query.toLowerCase())) relevance += 10;
      if (product.tags?.some(tag => tag.includes(query.toLowerCase()))) relevance += 5;
      if (product.ingredients?.some(ing => ing.name.includes(query.toLowerCase()))) relevance += 8;
      
      return { ...product, relevance };
    });
    
    return {
      query,
      results: scoredResults.sort((a, b) => b.relevance - a.relevance),
      count: scoredResults.length
    };
  } catch (error) {
    logger.error('Recommendations', 'Smart search failed', error);
    return { query, results: [], count: 0 };
  }
}
