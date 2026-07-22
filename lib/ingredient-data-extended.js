/**
 * Extended Ingredient Database
 * Adds interactive hub fields to existing taxonomy
 */

import { INGREDIENT_DATABASE } from './ingredient-taxonomy';

// Extended ingredient data with stories, facts, and media
export const EXTENDED_INGREDIENTS = {
  'sea moss': {
    ...INGREDIENT_DATABASE['sea moss'],
    name: 'Sea Moss',
    slug: 'sea-moss',
    description: 'Irish sea moss used in everyday drinks and recipes',
    longDescription: 'Sea moss, also known as Irish moss, is a type of red algae that grows along the rocky Atlantic coasts. It has been used for generations in coastal cuisines and traditional preparations.',
    scientificName: 'Chondrus crispus',
    origin: 'Atlantic Ocean coastlines',
    story: [
      {
        title: "Ocean's Gift",
        content: "For centuries, coastal communities have harvested this mineral-rich seaweed from cold Atlantic waters and folded it into food, drinks, and everyday routines."
      },
      {
        title: 'Wellness Tradition',
        content: 'Irish and Caribbean cultures have long prepared sea moss in tonics, gels, and drinks as a mineral-rich part of daily life.'
      }
    ],
    facts: [
      'Naturally mineral-rich seaweed used in many traditional foodways',
      'Contains iodine, so customers with thyroid concerns should ask a healthcare provider',
      'Naturally occurring fiber and plant pigments',
      'Commonly blended into gels, smoothies, teas, and fresh drinks'
    ],
    relatedIngredients: ['dulse', 'kelp', 'spirulina'],
    rarity: 'legendary',
    discoveryPoints: 100
  },
  'pineapple': {
    ...INGREDIENT_DATABASE['pineapple'],
    name: 'Pineapple',
    slug: 'pineapple',
    description: 'Tropical fruit with bright acidity and juicy flavor',
    longDescription: 'Pineapple is a tropical fruit known for its sweet-tart flavor and naturally occurring bromelain enzymes. It adds brightness and tropical character to drinks.',
    origin: 'South America',
    story: [
      {
        title: 'Tropical Treasure',
        content: 'Native to South America, pineapple was considered a luxury fruit and symbol of hospitality in colonial times.'
      }
    ],
    facts: [
      'Contains bromelain, a naturally occurring enzyme',
      'Bright tropical flavor',
      'Adds a bright, tropical note to juices and smoothies',
      'Paired well with coconut, ginger, and citrus'
    ],
    relatedIngredients: ['mango', 'papaya'],
    rarity: 'common',
    discoveryPoints: 25
  },
  'turmeric': {
    ...INGREDIENT_DATABASE['turmeric'],
    name: 'Turmeric',
    slug: 'turmeric',
    description: 'Golden spice used in everyday cooking and wellness routines',
    longDescription: 'Turmeric contains curcumin, the compound that gives it its golden color. It has been a staple in kitchens and traditional wellness routines for thousands of years.',
    scientificName: 'Curcuma longa',
    origin: 'India and Southeast Asia',
    story: [
      {
        title: 'Ancient Kitchen Staple',
        content: 'For over 4,000 years, turmeric has colored curries, tonics, and golden drinks across South Asia and beyond.'
      }
    ],
    facts: [
      'Contains curcumin, a widely studied food compound',
      'Used in everyday cooking across many cultures',
      'Traditional Ayurvedic preparation',
      'Enhanced flavor when paired with black pepper'
    ],
    relatedIngredients: ['ginger', 'cayenne'],
    rarity: 'rare',
    discoveryPoints: 75
  },
  'ginger': {
    ...INGREDIENT_DATABASE['ginger'],
    name: 'Ginger',
    slug: 'ginger',
    description: 'Warming root used in teas and fresh-pressed drinks',
    longDescription: 'Ginger root has been used for centuries to add heat, aroma, and brightness to teas, juices, and traditional tonics.',
    scientificName: 'Zingiber officinale',
    origin: 'Southeast Asia',
    story: [
      {
        title: 'Spice Route Staple',
        content: 'Ginger traveled the ancient spice routes, prized for its warming flavor and versatility.'
      }
    ],
    facts: [
      'Popular as a fresh ingredient in juices and teas',
      'Used in cooking across many cuisines',
      'Contains gingerol, a bioactive compound',
      'Pairs well with citrus, honey, and turmeric'
    ],
    relatedIngredients: ['turmeric', 'cayenne'],
    rarity: 'common',
    discoveryPoints: 30
  },
  'lemon': {
    ...INGREDIENT_DATABASE['lemon'],
    name: 'Lemon',
    slug: 'lemon',
    description: 'Citrus fruit with bright acidity',
    longDescription: 'Lemons add bright acidity and freshness, used to balance sweetness in drinks.',
    scientificName: 'Citrus limon',
    origin: 'Asia',
    facts: [
      'Bright, clean citrus flavor',
      'Adds brightness to beverages and dishes',
      'Aids in iron absorption from plant foods',
      'Commonly squeezed fresh for maximum flavor'
    ],
    relatedIngredients: ['lime', 'orange'],
    rarity: 'common',
    discoveryPoints: 20
  }
};

// Generate extended data for remaining ingredients
export const getAllExtendedIngredients = () => {
  const extended = { ...EXTENDED_INGREDIENTS };
  
  // Add basic extensions for ingredients not yet detailed
  Object.keys(INGREDIENT_DATABASE).forEach(key => {
    if (!extended[key]) {
      const ingredient = INGREDIENT_DATABASE[key];
      extended[key] = {
        ...ingredient,
        name: key.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        slug: key.toLowerCase().replace(/\s+/g, '-'),
        description: `${key.charAt(0).toUpperCase() + key.slice(1)} - A flavorful ingredient used in our recipes`,
        longDescription: `${key.charAt(0).toUpperCase() + key.slice(1)} is valued for its flavor and traditional use in drinks and food.`,
        origin: 'Various regions',
        story: [
          {
            title: 'Natural Wellness',
            content: `${key.charAt(0).toUpperCase() + key.slice(1)} has been enjoyed for its flavor in many food traditions.`
          }
        ],
        facts: ingredient.benefits.map(b => `Traditionally used for ${b}`),
        relatedIngredients: [],
        rarity: 'common',
        discoveryPoints: 15
      };
    }
  });
  
  return extended;
};

export const getIngredientBySlug = (slug) => {
  const allIngredients = getAllExtendedIngredients();
  return Object.values(allIngredients).find(ing => ing.slug === slug);
};

export const getAllIngredientSlugs = () => {
  const allIngredients = getAllExtendedIngredients();
  return Object.values(allIngredients).map(ing => ing.slug);
};
