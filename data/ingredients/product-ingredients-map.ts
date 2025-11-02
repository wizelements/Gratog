// Product-specific ingredient mappings
// Maps product slugs to their ingredient lists

import { getIngredients, INGREDIENT_DATABASE } from './shared-ingredients';

export const PRODUCT_INGREDIENTS: Record<string, string[]> = {
  // GELS
  'elderberry-moss': ['sea-moss', 'elderberry', 'alkaline-water'],
  'healing-harmony': ['sea-moss', 'alkaline-water'],
  'golden-glow-gel': ['pineapple', 'turmeric', 'ginger', 'local-honey', 'alkaline-water'],
  'blue-lotus': ['spirulina', 'ashwagandha', 'maca-root', 'ginger', 'agave'],
  'grateful-greens': ['basil', 'spirulina', 'local-honey'],
  'floral-tide': ['hibiscus', 'cranberry', 'pineapple', 'turmeric', 'ginger', 'lemon', 'agave'],
  
  // LEMONADES
  'pineapple-basil': ['pineapple', 'basil', 'lemon', 'alkaline-water', 'agave'],
  'apple-cranberry': ['pineapple', 'cranberry', 'ginger', 'lemon', 'sea-moss'],
  'grateful-guardian': ['elderberry', 'cranberry', 'ginger', 'lemon', 'sea-moss'],
  'rejuvenate': ['turmeric', 'ginger', 'lemon', 'sea-moss', 'alkaline-water'],
  'supplemint': ['mint', 'ginger', 'agave', 'sea-moss', 'alkaline-water'],
  'pineapple-mango': ['pineapple', 'ginger', 'lemon', 'sea-moss', 'agave'],
  'kissed-by-gods': ['basil', 'ginger', 'lemon', 'sea-moss', 'agave'],
  'pineapple-melon': ['pineapple', 'ginger', 'lemon', 'sea-moss'],
  'herbal-vibe': ['pineapple', 'ginger', 'mint', 'lemon'],
  'strawberry-rhubarb': ['sea-moss', 'ginger', 'lemon'],
  'strawberry-bliss': ['lemon', 'sea-moss', 'ginger'],
  
  // SHOTS
  'gratitude-defense': ['elderberry', 'cranberry', 'ginger', 'lemon', 'sea-moss'],
  'spicy-bloom': ['hibiscus', 'pineapple', 'cranberry', 'lemon', 'sea-moss', 'agave']
};

// Helper to get ingredients for a product
export function getProductIngredients(productSlug: string) {
  const ingredientSlugs = PRODUCT_INGREDIENTS[productSlug] || [];
  return getIngredients(ingredientSlugs);
}

// Check if product has ingredients data
export function hasIngredientsData(productSlug: string): boolean {
  return productSlug in PRODUCT_INGREDIENTS && PRODUCT_INGREDIENTS[productSlug].length > 0;
}
