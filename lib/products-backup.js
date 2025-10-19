// Product catalog - Enhanced with Square product links and robust data structure
export const PRODUCTS = [
  {
    id: 'elderberry-moss',
    slug: 'elderberry-moss',
    name: 'Elderberry Moss',
    subtitle: 'Sea Moss Gel',
    description: 'Elderberry Moss Gels combine the natural benefits of sea moss and elderberry to support immune health with ease. This nutrient-rich gel is made with natural ingredients and is simple to incorporate into your daily routine.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/CPFQJP5N2DGVL5US32BI5WFV.jpeg',
    price: 36.00,
    size: '16oz',
    ingredients: ['Sea Moss', 'Elderberry', 'Natural Ingredients'],
    benefits: ['Immune Support', '92+ Essential Minerals', 'Nutrient-Rich', 'Natural Ingredients'],
    featured: true,
    squareProductUrl: 'https://square.link/u/elderberry-moss',
    category: 'gel',
    stock: 15,
    rewardPoints: 25
  },
  {
    id: 'healing-harmony',
    slug: 'healing-harmony',
    name: 'Healing Harmony',
    subtitle: 'Soursop • Cinnamon • Star Anise',
    description: 'A harmonious blend featuring soursop rich in antioxidants, cinnamon for blood sugar regulation, and star anise for digestion. Combined with sea moss providing 92 minerals and alkaline water for optimal pH balance.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/ZHB653PNM4Q6HSEPML2YQRPP.jpeg',
    price: 35.00,
    size: '16oz',
    ingredients: ['Soursop', 'Cinnamon', 'Star Anise', 'Sea Moss', 'Alkaline Water'],
    benefits: ['Immune Support', 'Anti-inflammatory', 'Blood Sugar Balance', 'Digestive Support'],
    featured: true,
    squareProductUrl: 'https://square.link/u/healing-harmony',
    category: 'gel',
    stock: 12,
    rewardPoints: 25
  },
  {
    id: 'grateful-guardian',
    slug: 'grateful-guardian',
    name: 'Grateful Guardian',
    subtitle: 'Elderberry • Cranberry • Echinacea',
    description: 'A tangy immune powerhouse of elderberry, cranberry, apple, ginger, lemon, echinacea, sea moss, and alkaline water — designed to boost immunity, fight inflammation, support digestion, and deliver 92+ minerals in every sip.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/BXLLKEBC55LYDWKNGR46FBOC.jpeg',
    price: 11.00,
    size: '16oz',
    ingredients: ['Elderberry', 'Cranberry', 'Apple', 'Ginger', 'Lemon', 'Echinacea', 'Sea Moss', 'Alkaline Water'],
    benefits: ['Immune Boost', 'Anti-inflammatory', 'Digestive Support', '92+ Minerals'],
    featured: true,
    squareProductUrl: 'https://square.link/u/grateful-guardian',
    category: 'lemonade',
    stock: 20,
    rewardPoints: 15
  },
  {
    id: 'apple-cranberry',
    slug: 'apple-cranberry',
    name: 'Apple Cranberry',
    subtitle: 'Apple • Cranberry • Pineapple',
    description: 'A refreshing fusion of apple, pineapple, cranberry, lime, lemon, ginger, and mineral-rich sea moss. This blend supports digestion, boosts immunity, aids detox, and delivers natural energy. Packed with antioxidants and 92 essential minerals.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/7XDOGKFATQ3X3VFIXMU43MWH.jpeg',
    price: 12.00,
    size: '16oz',
    ingredients: ['Apple', 'Pineapple', 'Cranberry', 'Lime', 'Lemon', 'Ginger', 'Sea Moss'],
    benefits: ['Digestive Support', 'Immune Boost', 'Detox', 'Natural Energy'],
    featured: true,
    squareProductUrl: 'https://square.link/u/apple-cranberry',
    category: 'lemonade',
    stock: 18,
    rewardPoints: 15
  },
  {
    id: 'pineapple-mango-lemonade',
    slug: 'pineapple-mango-lemonade',
    name: 'Pineapple Mango Lemonade',
    subtitle: 'Tropical Fusion',
    description: 'A tropical blend of pineapple, mango, and lemon with ginger, sea moss, agave, and alkaline water. Packed with Vitamin C, digestive enzymes, and 92+ essential minerals, this tropical blend supports immunity, gut health, energy, and hydration.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/UCF3MSCWPZRQKW7NFGXIKMGV.jpeg',
    price: 11.00,
    size: '16oz',
    ingredients: ['Pineapple', 'Mango', 'Lemon', 'Ginger', 'Sea Moss', 'Agave', 'Alkaline Water'],
    benefits: ['Vitamin C Rich', 'Digestive Enzymes', 'Immunity Support', 'Natural Hydration'],
    featured: false,
    squareProductUrl: 'https://square.link/u/pineapple-mango-lemonade',
    category: 'lemonade',
    stock: 25,
    rewardPoints: 15
  },
  {
    id: 'golden-glow-gel',
    slug: 'golden-glow-gel',
    name: 'Golden Glow Gel',
    subtitle: 'Skincare Sea Moss Gel',
    description: 'Golden Glow Gel is crafted with natural sea moss to nourish and hydrate your skin, promoting a radiant and healthy appearance. Its gentle, hydrating formula makes it an excellent addition to any skincare routine.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/IB23YBEFP6SBAIOEWT4L5ARY.jpeg',
    price: 36.00,
    size: '16oz',
    ingredients: ['Natural Sea Moss', 'Nourishing Botanicals'],
    benefits: ['Skin Nourishment', 'Deep Hydration', 'Radiant Glow', 'Gentle Formula'],
    featured: false,
    squareProductUrl: 'https://square.link/u/golden-glow-gel',
    category: 'gel',
    stock: 8,
    rewardPoints: 25
  },
  {
    id: 'blue-lotus',
    slug: 'blue-lotus',
    name: 'Blue Lotus',
    subtitle: 'Blue Spirulina • Maca Root • Ashwagandha',
    description: 'A mood-boosting blend featuring blue spirulina, pineapple, maca root, ashwagandha, and local honey. Designed to balance hormones, enhance energy, and improve focus for overall wellness.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/5ICW6ZAQAEH3PGEZBWBDXFRQ.jpeg',
    price: 35.00,
    size: '16oz',
    ingredients: ['Blue Spirulina', 'Pineapple', 'Maca Root', 'Ashwagandha', 'Local Honey'],
    benefits: ['Mood Boost', 'Hormone Balance', 'Enhanced Energy', 'Improved Focus'],
    featured: false,
    squareProductUrl: 'https://square.link/u/blue-lotus',
    category: 'gel',
    stock: 10,
    rewardPoints: 25
  },
  {
    id: 'grateful-greens',
    slug: 'grateful-greens',
    name: 'Grateful Greens',
    subtitle: 'Holy Basil • Spirulina • Chlorophyll',
    description: 'An alkalizing powerhouse featuring holy basil, spirulina, chlorophyll, chlorella, and local honey. Supports hormonal balance, cellular rejuvenation, and overall detoxification.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/WZXG7JSUC2EYTSTJLERXRSYL.jpeg',
    price: 35.00,
    size: '16oz',
    ingredients: ['Holy Basil', 'Spirulina', 'Chlorophyll', 'Chlorella', 'Local Honey'],
    benefits: ['Alkalizing Greens', 'Hormonal Balance', 'Cellular Rejuvenation', 'Detoxification'],
    featured: false,
    squareProductUrl: 'https://square.link/u/grateful-greens',
    category: 'gel',
    stock: 14,
    rewardPoints: 25
  },
  {
    id: 'floral-tide',
    slug: 'floral-tide',
    name: 'Floral Tide',
    subtitle: 'Sorrel • Turmeric • Bee Pollen',
    description: 'Floral Tide Sea Moss Gels combine sorrel, turmeric, bee pollen, local honey, cranberry, and pineapple for a nutrient-packed blend. This versatile gel is an excellent addition to smoothies, teas, or your daily wellness routine.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/BCT7OKTLSDWU3WW7P45AOHVK.jpeg',
    price: 36.00,
    size: '16oz',
    ingredients: ['Sorrel', 'Turmeric', 'Bee Pollen', 'Local Honey', 'Cranberry', 'Pineapple', 'Sea Moss'],
    benefits: ['Nutrient-Packed', 'Anti-inflammatory', 'Versatile', 'Antioxidant Rich'],
    featured: false,
    squareProductUrl: 'https://square.link/u/floral-tide',
    category: 'gel',
    stock: 11,
    rewardPoints: 25
  },
  {
    id: 'kissed-by-gods',
    slug: 'kissed-by-gods',
    name: 'Kissed by Gods',
    subtitle: 'Basil • Ginger • Chlorophyll',
    description: 'Basil, ginger, chlorophyll, lemon, agave, sea moss, and alkaline water combined to purify blood, balance pH, and boost skin clarity and mood.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/FCXGGWWNRAR3ROIOPDBIO6M4.jpeg',
    price: 10.00,
    size: '16oz',
    ingredients: ['Basil', 'Ginger', 'Chlorophyll', 'Lemon', 'Agave', 'Sea Moss', 'Alkaline Water'],
    benefits: ['Blood Purification', 'pH Balance', 'Skin Clarity', 'Mood Boost'],
    featured: false,
    squareProductUrl: 'https://square.link/u/kissed-by-gods',
    category: 'lemonade',
    stock: 22,
    rewardPoints: 12
  },
  {
    id: 'supplemint',
    slug: 'supplemint',
    name: 'SuppleMint',
    subtitle: 'Mint • Ginger',
    description: 'Mint, ginger, agave, sea moss, and alkaline water create a refreshing detox blend that aids digestion, reduces nausea, and clears sinuses.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/I47GEZOG7LWKFK5THGLJVCFP.jpeg',
    price: 10.00,
    size: '16oz',
    ingredients: ['Mint', 'Ginger', 'Agave', 'Sea Moss', 'Alkaline Water'],
    benefits: ['Refreshing Detox', 'Digestive Aid', 'Nausea Relief', 'Sinus Clearing'],
    featured: false,
    squareProductUrl: 'https://square.link/u/supplemint',
    category: 'lemonade',
    stock: 28,
    rewardPoints: 12
  },
  {
    id: 'gratitude-defense',
    slug: 'gratitude-defense',
    name: 'Gratitude Defense',
    subtitle: 'Elderberry • Cranberry • Echinacea',
    description: 'Elderberry, cranberry, apple, ginger, lemon, echinacea, and sea moss combined for strong immune defense, digestive support, and 92+ essential minerals.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/7G2QSRNEWAACVG3DXL27W7KO.jpeg',
    price: 5.00,
    size: '2oz Shot',
    ingredients: ['Elderberry', 'Cranberry', 'Apple', 'Ginger', 'Lemon', 'Echinacea', 'Sea Moss'],
    benefits: ['Strong Immune Defense', 'Digestive Support', '92+ Minerals', 'Quick Boost'],
    featured: false,
    squareProductUrl: 'https://square.link/u/gratitude-defense',
    category: 'shot',
    stock: 35,
    rewardPoints: 8
  },
  {
    id: 'spicy-bloom',
    slug: 'spicy-bloom',
    name: 'Spicy Bloom',
    subtitle: 'Hibiscus • Pineapple • Jalapeño',
    description: 'Hibiscus, pineapple, orange, cranberry, lemon, jalapeño, sea moss, agave, and alkaline water create a spicy, vibrant blend.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/EJ3LK4ECIAME3LAUHBIBLZ2L.jpeg',
    price: 5.00,
    size: '2oz Shot',
    ingredients: ['Hibiscus', 'Pineapple', 'Orange', 'Cranberry', 'Lemon', 'Jalapeño', 'Sea Moss', 'Agave', 'Alkaline Water'],
    benefits: ['Metabolism Boost', 'Antioxidant Rich', 'Spicy Kick', 'Immune Support'],
    featured: false,
    squareProductUrl: 'https://square.link/u/spicy-bloom',
    category: 'shot',
    stock: 40,
    rewardPoints: 8
  }
];

// Markets data
export const MARKETS = [
  {
    id: 1,
    name: 'Serenbe Farmers Market',
    when: 'Saturdays 9:00 AM - 1:00 PM',
    where: 'Serenbe Community, Chattahoochee Hills, GA',
    mapsUrl: 'https://maps.google.com/?q=Serenbe+Farmers+Market'
  },
  {
    id: 2,
    name: 'East Atlanta Village Market',
    when: 'Sundays 11:00 AM - 4:00 PM',
    where: 'Brownwood Park, East Atlanta, GA',
    mapsUrl: 'https://maps.google.com/?q=East+Atlanta+Village+Market'
  }
];

// Enhanced helper functions
export function getProductBySlug(slug) {
  return PRODUCTS.find(p => p.slug === slug);
}

export function getFeaturedProducts() {
  return PRODUCTS.filter(p => p.featured);
}

export function getProductsByCategory(category) {
  return PRODUCTS.filter(p => p.category === category);
}

export function getProductsInStock() {
  return PRODUCTS.filter(p => p.stock > 0);
}

export function calculateRewardPoints(productIds) {
  return productIds.reduce((total, id) => {
    const product = PRODUCTS.find(p => p.id === id);
    return total + (product?.rewardPoints || 0);
  }, 0);
}

// Product categories for filtering
export const PRODUCT_CATEGORIES = {
  gel: 'Sea Moss Gels',
  lemonade: 'Lemonades', 
  shot: 'Wellness Shots'
};