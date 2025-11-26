/**
 * Extended Ingredient Database
 * Adds interactive hub fields to existing taxonomy
 */

import { INGREDIENT_DATABASE } from './ingredient-taxonomy';

// Extended ingredient data with stories, facts, and media
export const EXTENDED_INGREDIENTS = {
  'sea moss': {
    ...INGREDIENT_DATABASE['sea moss'],
    slug: 'sea-moss',
    description: 'Wildcrafted Irish sea moss packed with 92 of 102 essential minerals',
    longDescription: 'Sea moss, also known as Irish moss, is a type of red algae that grows along the rocky Atlantic coasts. Rich in nutrients and minerals, it has been used for centuries in traditional medicine and cuisine.',
    scientificName: 'Chondrus crispus',
    origin: 'Atlantic Ocean coastlines',
    story: [
      {
        title: "Ocean's Gift",
        content: "For centuries, coastal communities have harvested this mineral-rich seaweed from the cold Atlantic waters. Its unique composition of 92 minerals mirrors the human body's needs."
      },
      {
        title: 'Wellness Tradition',
        content: 'Irish and Caribbean cultures have long recognized sea moss as a powerful health tonic, using it to support immunity, digestion, and overall vitality.'
      }
    ],
    facts: [
      'Contains 92 of the 102 minerals found in the human body',
      'Natural source of iodine for thyroid support',
      'Rich in antioxidants and prebiotic fiber',
      'Traditionally used to support respiratory health'
    ],
    relatedIngredients: ['dulse', 'kelp', 'spirulina'],
    rarity: 'legendary',
    discoveryPoints: 100
  },
  'pineapple': {
    ...INGREDIENT_DATABASE['pineapple'],
    slug: 'pineapple',
    description: 'Tropical fruit rich in bromelain enzyme and vitamin C',
    longDescription: 'Pineapple is a tropical fruit known for its sweet-tart flavor and impressive enzyme content. The bromelain enzyme in pineapple aids digestion and supports inflammation reduction.',
    origin: 'South America',
    story: [
      {
        title: 'Tropical Treasure',
        content: 'Native to South America, pineapple was considered a luxury fruit and symbol of hospitality in colonial times.'
      }
    ],
    facts: [
      'Contains bromelain, a powerful digestive enzyme',
      'High in vitamin C and manganese',
      'May help reduce inflammation',
      'Supports immune function'
    ],
    relatedIngredients: ['mango', 'papaya'],
    rarity: 'common',
    discoveryPoints: 25
  },
  'turmeric': {
    ...INGREDIENT_DATABASE['turmeric'],
    slug: 'turmeric',
    description: 'Golden spice with powerful anti-inflammatory properties',
    longDescription: 'Turmeric contains curcumin, a compound with potent anti-inflammatory and antioxidant effects. Used in Ayurvedic medicine for thousands of years.',
    scientificName: 'Curcuma longa',
    origin: 'India and Southeast Asia',
    story: [
      {
        title: 'Ancient Medicine',
        content: 'For over 4,000 years, turmeric has been a cornerstone of Ayurvedic healing, revered for its golden color and therapeutic properties.'
      }
    ],
    facts: [
      'Contains curcumin, a powerful anti-inflammatory',
      'May support brain health and cognition',
      'Traditional Ayurvedic medicine staple',
      'Enhanced absorption when paired with black pepper'
    ],
    relatedIngredients: ['ginger', 'cayenne'],
    rarity: 'rare',
    discoveryPoints: 75
  },
  'ginger': {
    ...INGREDIENT_DATABASE['ginger'],
    slug: 'ginger',
    description: 'Warming root known for digestive support',
    longDescription: 'Ginger root has been used for centuries to aid digestion, reduce nausea, and provide anti-inflammatory benefits.',
    scientificName: 'Zingiber officinale',
    origin: 'Southeast Asia',
    story: [
      {
        title: 'Spice Route Staple',
        content: 'Ginger traveled the ancient spice routes, prized for its medicinal properties and distinctive warming flavor.'
      }
    ],
    facts: [
      'May reduce nausea and morning sickness',
      'Supports healthy digestion',
      'Contains gingerol, a bioactive compound',
      'Traditional remedy for colds and flu'
    ],
    relatedIngredients: ['turmeric', 'cayenne'],
    rarity: 'common',
    discoveryPoints: 30
  },
  'lemon': {
    ...INGREDIENT_DATABASE['lemon'],
    slug: 'lemon',
    description: 'Citrus fruit packed with vitamin C',
    longDescription: 'Lemons are an excellent source of vitamin C and flavonoids, supporting immune function and providing antioxidant protection.',
    scientificName: 'Citrus limon',
    origin: 'Asia',
    facts: [
      'Excellent source of vitamin C',
      'May support heart health',
      'Aids in iron absorption',
      'Alkalizing effect on the body'
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
        slug: key.toLowerCase().replace(/\s+/g, '-'),
        description: `${ingredient.name} - A wellness ingredient with multiple benefits`,
        longDescription: `${ingredient.name} is known for its ${ingredient.benefits.slice(0, 2).join(' and ')} properties.`,
        origin: 'Various regions',
        story: [
          {
            title: 'Natural Wellness',
            content: `${ingredient.name} has been valued for its health-supporting properties.`
          }
        ],
        facts: ingredient.benefits.map(b => `Supports ${b}`),
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
