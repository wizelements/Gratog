// Updated Product Catalog with accurate prices from tasteofgratitude.shop
// All prices match Square Online store as of current date

export const PRODUCTS = [
  // GELS - Premium Sea Moss Products
  {
    id: 'elderberry-moss',
    slug: 'elderberry-moss',
    name: 'Elderberry Moss',
    category: 'gel',
    price: 36.00,
    size: '16oz',
    description: 'Elderberry Moss Gels combine the natural benefits of sea moss and elderberry to support immune health with ease. This nutrient-rich gel is made with natural ingredients and is simple to incorporate into your daily routine.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/CPFQJP5N2DGVL5US32BI5WFV.jpeg',
    ingredients: ['Sea Moss', 'Elderberry', 'Natural Ingredients'],
    benefits: ['Immune Support', '92+ Essential Minerals', 'Nutrient-Rich'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=elderberry-moss',
    featured: true,
    inStock: false,
    rewardPoints: 36
  },
  {
    id: 'healing-harmony',
    slug: 'healing-harmony',
    name: 'Healing Harmony',
    category: 'gel',
    price: 35.00,
    size: '16oz',
    description: 'Soursop Rich in antioxidants, supports immune health, may help reduce inflammation. Cinnamon helps regulate blood sugar, anti-inflammatory, warming spice. Star Anise supports digestion, antimicrobial properties, aromatic flavor. Sea Moss provides 92 minerals, collagen support for skin/joints, thyroid balance, gut + respiratory health. Alkaline Water hydrating, helps maintain pH balance.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/ZHB653PNM4Q6HSEPML2YQRPP.jpeg',
    ingredients: ['Soursop', 'Cinnamon', 'Star Anise', 'Sea Moss', 'Alkaline Water'],
    benefits: ['Immune Support', 'Anti-inflammatory', 'Blood Sugar Balance', 'Digestive Support'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=healing-harmony',
    featured: true,
    inStock: true,
    lowStock: true,
    rewardPoints: 35
  },
  {
    id: 'golden-glow-gel',
    slug: 'golden-glow-gel',
    name: 'Golden Glow Gel',
    category: 'gel',
    price: 36.00,
    priceMini: 11.00,
    sizes: ['2oz Shot', '16oz Gel'],
    description: 'Pineapple, Orange, Turmeric, Ginger, Local Honey, Alkaline Water. Reduces inflammation & joint pain, supports immunity & digestion, promotes radiant skin & circulation, aids recovery & natural detox.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/IB23YBEFP6SBAIOEWT4L5ARY.jpeg',
    ingredients: ['Pineapple', 'Orange', 'Turmeric', 'Ginger', 'Local Honey', 'Alkaline Water'],
    benefits: ['Reduces Inflammation', 'Immunity Support', 'Radiant Skin', 'Natural Detox'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=golden-glow-gel',
    featured: false,
    inStock: true,
    lowStock: true,
    rewardPoints: 36
  },
  {
    id: 'blue-lotus',
    slug: 'blue-lotus',
    name: 'Blue Lotus',
    category: 'gel',
    price: 36.00,
    priceMini: 11.00,
    sizes: ['2oz Shot', '16oz Gel'],
    description: 'Blue Spirulina, Horny Goat Weed, Ashwagandha, Maca Root, Ginger, Agave. Supports hormonal balance & libido, promotes focus & calm energy, reduces stress & anxiety naturally, boosts endurance & overall vitality.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/5ICW6ZAQAEH3PGEZBWBDXFRQ.jpeg',
    ingredients: ['Blue Spirulina', 'Horny Goat Weed', 'Ashwagandha', 'Maca Root', 'Ginger', 'Agave'],
    benefits: ['Hormonal Balance', 'Focus & Calm', 'Stress Relief', 'Boosts Vitality'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=blue-lotus',
    featured: false,
    inStock: true,
    lowStock: true,
    rewardPoints: 36
  },
  {
    id: 'grateful-greens',
    slug: 'grateful-greens',
    name: 'Grateful Greens',
    category: 'gel',
    price: 35.00,
    description: 'Holy Basil, Spirulina, Chlorophyll, Chlorella, Local Honey. Alkalizing greens, hormonal balance, cellular rejuvenation.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/WZXG7JSUC2EYTSTJLERXRSYL.jpeg',
    ingredients: ['Holy Basil', 'Spirulina', 'Chlorophyll', 'Chlorella', 'Local Honey'],
    benefits: ['Alkalizing', 'Hormonal Balance', 'Cellular Rejuvenation'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=grateful-greens',
    featured: false,
    inStock: false,
    rewardPoints: 35
  },
  {
    id: 'floral-tide',
    slug: 'floral-tide',
    name: 'Floral Tide',
    category: 'gel',
    price: 36.00,
    priceMini: 11.00,
    sizes: ['2oz Shot', '16oz Gel'],
    description: 'Hibiscus, Cranberry, Pineapple, Orange, Turmeric, Ginger, Lemon, Agave, Alkaline Water, Bee Pollen. Promotes circulation & heart health, supports immune & liver function, reduces inflammation & fatigue, rich in antioxidants & nutrients.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/BCT7OKTLSDWU3WW7P45AOHVK.jpeg',
    ingredients: ['Hibiscus', 'Cranberry', 'Pineapple', 'Orange', 'Turmeric', 'Ginger', 'Lemon', 'Agave', 'Bee Pollen'],
    benefits: ['Heart Health', 'Immune Support', 'Anti-inflammatory', 'Antioxidant Rich'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=floral-tide',
    featured: false,
    inStock: true,
    lowStock: true,
    rewardPoints: 36
  },

  // LEMONADES - 16oz Bottles
  {
    id: 'pineapple-basil',
    slug: 'pineapple-basil',
    name: 'Pineapple Basil',
    category: 'lemonade',
    price: 11.00,
    size: '16oz',
    description: 'Pineapple Basil Lemonade: Pineapple, Basil, lemons, alkaline water, agave.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/BLRQKPOBCADIZ43JPJQ6ZKQT.jpeg',
    ingredients: ['Pineapple', 'Basil', 'Lemons', 'Alkaline Water', 'Agave'],
    benefits: ['Refreshing', 'Digestive Support', 'Natural Energy'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=pineapple-basil',
    featured: true,
    inStock: true,
    rewardPoints: 11
  },
  {
    id: 'apple-cranberry',
    slug: 'apple-cranberry',
    name: 'Apple Cranberry',
    category: 'lemonade',
    price: 12.00,
    size: '16oz',
    description: 'A refreshing fusion of apple, pineapple, cranberry, lime, lemon, ginger, and mineral-rich sea moss. This blend supports digestion, boosts immunity, aids detox, and delivers natural energy. Packed with antioxidants and 92 essential minerals.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/7XDOGKFATQ3X3VFIXMU43MWH.jpeg',
    ingredients: ['Apple', 'Pineapple', 'Cranberry', 'Lime', 'Lemon', 'Ginger', 'Sea Moss'],
    benefits: ['Digestive Support', 'Immunity Boost', 'Detox', 'Natural Energy'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=apple-cranberry',
    featured: true,
    inStock: true,
    lowStock: true,
    rewardPoints: 12
  },
  {
    id: 'grateful-guardian',
    slug: 'grateful-guardian',
    name: 'Grateful Guardian',
    category: 'lemonade',
    price: 11.00,
    size: '16oz',
    description: 'A tangy immune powerhouse of elderberry, cranberry, apple, ginger, lemon, echinacea, sea moss, and alkaline water — designed to boost immunity, fight inflammation, support digestion, and deliver 92+ minerals in every sip.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/BXLLKEBC55LYDWKNGR46FBOC.jpeg',
    ingredients: ['Elderberry', 'Cranberry', 'Apple', 'Ginger', 'Lemon', 'Echinacea', 'Sea Moss'],
    benefits: ['Immune Boost', 'Anti-inflammatory', 'Digestive Support', '92+ Minerals'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=grateful-guardian',
    featured: true,
    inStock: true,
    rewardPoints: 11
  },
  {
    id: 'rejuvenate',
    slug: 'rejuvenate',
    name: 'Rejuvenate',
    category: 'lemonade',
    price: 11.00,
    size: '16oz',
    description: 'Grapefruit, orange, turmeric, key lime, cayenne, ginger, chia seeds, sea moss, maple, alkaline water. Full-body cleanse, metabolism booster, joint and immune support.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/KE2L2V6L4STXXRBDNCG6DRX4.jpeg',
    ingredients: ['Grapefruit', 'Orange', 'Turmeric', 'Key Lime', 'Cayenne', 'Ginger', 'Chia Seeds', 'Sea Moss', 'Maple'],
    benefits: ['Full-body Cleanse', 'Metabolism Boost', 'Joint Support', 'Immune Support'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=rejuvenate',
    featured: false,
    inStock: true,
    rewardPoints: 11
  },
  {
    id: 'supplemint',
    slug: 'supplemint',
    name: 'SuppleMint',
    category: 'lemonade',
    price: 11.00,
    size: '16oz',
    description: 'Mint, ginger, agave, sea moss, alkaline water. Refreshing detox, aids digestion, reduces nausea, clears sinuses.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/I47GEZOG7LWKFK5THGLJVCFP.jpeg',
    ingredients: ['Mint', 'Ginger', 'Agave', 'Sea Moss', 'Alkaline Water'],
    benefits: ['Refreshing Detox', 'Digestive Aid', 'Reduces Nausea', 'Clears Sinuses'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=supplemint',
    featured: false,
    inStock: true,
    rewardPoints: 11
  },
  {
    id: 'pineapple-mango',
    slug: 'pineapple-mango',
    name: 'Pineapple Mango Lemonade',
    category: 'lemonade',
    price: 11.00,
    size: '16oz',
    description: 'A tropical blend of pineapple, mango, and lemon with ginger, sea moss, agave, and alkaline water. Packed with Vitamin C, digestive enzymes, and 92+ essential minerals, this tropical blend supports immunity, gut health, energy, hydration, and inflammation relief.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/UCF3MSCWPZRQKW7NFGXIKMGV.jpeg',
    ingredients: ['Pineapple', 'Mango', 'Lemon', 'Ginger', 'Sea Moss', 'Agave'],
    benefits: ['Immunity Support', 'Gut Health', 'Natural Energy', 'Hydration'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=pineapple-mango',
    featured: false,
    inStock: true,
    rewardPoints: 11
  },
  {
    id: 'kissed-by-gods',
    slug: 'kissed-by-gods',
    name: 'Kissed by Gods',
    category: 'lemonade',
    price: 11.00,
    size: '16oz',
    description: 'Basil, Chlorophyll, Ginger, Lemon, Sea Moss, Agave. Supports liver & immune health, promotes natural detox & hydration, boosts energy & circulation, reduces inflammation & fatigue.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/FCXGGWWNRAR3ROIOPDBIO6M4.jpeg',
    ingredients: ['Basil', 'Chlorophyll', 'Ginger', 'Lemon', 'Sea Moss', 'Agave'],
    benefits: ['Liver Health', 'Natural Detox', 'Energy Boost', 'Anti-inflammatory'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=kissed-by-gods',
    featured: false,
    inStock: true,
    rewardPoints: 11
  },
  {
    id: 'pineapple-melon',
    slug: 'pineapple-melon',
    name: 'Pineapple Melon',
    category: 'lemonade',
    price: 10.00,
    size: '16oz',
    description: 'Pineapple, yellow watermelon, ginger, lemon, sea moss. Anti-inflammatory, supports digestion, naturally hydrating.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/OX24GKXIUI4TBDNC52GQEJYH.jpeg',
    ingredients: ['Pineapple', 'Yellow Watermelon', 'Ginger', 'Lemon', 'Sea Moss'],
    benefits: ['Anti-inflammatory', 'Digestive Support', 'Hydrating'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=pineapple-melon',
    featured: false,
    inStock: false,
    rewardPoints: 10
  },
  {
    id: 'herbal-vibe',
    slug: 'herbal-vibe',
    name: 'Herbal Vibe',
    category: 'lemonade',
    price: 12.00,
    size: '16oz',
    description: 'A bold blend featuring pineapple, apple, ginger, oregano, mint, and lemon, thoughtfully crafted to invigorate your senses. Enjoy a refreshing mix designed to energize, purify, and support your daily wellness routine.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/AOJWRGGCAEM2WWMF2AZQO3CN.jpeg',
    ingredients: ['Pineapple', 'Apple', 'Ginger', 'Oregano', 'Mint', 'Lemon'],
    benefits: ['Energize', 'Purify', 'Wellness Support'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=herbal-vibe',
    featured: false,
    inStock: false,
    rewardPoints: 12
  },
  {
    id: 'strawberry-rhubarb',
    slug: 'strawberry-rhubarb',
    name: 'Strawberry Rhubarb',
    category: 'lemonade',
    price: 10.00,
    size: '16oz',
    description: 'Strawberry Rhubarb - Sea Moss Ginger Lemonade combines refreshing fruity flavors with nutrient-rich sea moss and zesty ginger for a wellness boost. Packed with immune-supporting ingredients.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/JNDX77PLQHLNWEZBUMELFA2P.jpeg',
    ingredients: ['Strawberry', 'Rhubarb', 'Sea Moss', 'Ginger', 'Lemon'],
    benefits: ['Immune Support', 'Wellness Boost', 'Refreshing'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=strawberry-rhubarb',
    featured: false,
    inStock: false,
    rewardPoints: 10
  },
  {
    id: 'strawberry-bliss',
    slug: 'strawberry-bliss',
    name: 'Strawberry Bliss',
    category: 'lemonade',
    price: 10.00,
    size: '16oz',
    description: 'Refreshing blend of tangy strawberry lemonade combined with the wellness benefits of nutrient-rich sea moss and invigorating ginger. Perfect for hydration and supporting your daily wellness routine.',
    image: 'https://images.unsplash.com/photo-1568471173238-64e8cf5a0e6f?w=400',
    ingredients: ['Strawberry', 'Lemon', 'Sea Moss', 'Ginger'],
    benefits: ['Hydration', 'Wellness Support', 'Refreshing'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=strawberry-bliss',
    featured: false,
    inStock: false,
    rewardPoints: 10
  },

  // WELLNESS SHOTS - 2oz
  {
    id: 'gratitude-defense',
    slug: 'gratitude-defense',
    name: 'Gratitude Defense',
    category: 'shot',
    price: 5.00,
    size: '2oz',
    description: 'Elderberry, Cranberry, Apple, Ginger, Lemon, Echinacea, Sea Moss. Strong immune defense, digestive support, 92+ essential minerals.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/7G2QSRNEWAACVG3DXL27W7KO.jpeg',
    ingredients: ['Elderberry', 'Cranberry', 'Apple', 'Ginger', 'Lemon', 'Echinacea', 'Sea Moss'],
    benefits: ['Immune Defense', 'Digestive Support', '92+ Minerals'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=gratitude-defense',
    featured: true,
    inStock: true,
    rewardPoints: 5
  },
  {
    id: 'spicy-bloom',
    slug: 'spicy-bloom',
    name: 'Spicy Bloom',
    category: 'shot',
    price: 5.00,
    size: '2oz',
    description: 'Hibiscus, Pineapple, Orange, Cranberry, Lemon, Jalapeño, Sea Moss, Agave, Alkaline Water.',
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/EJ3LK4ECIAME3LAUHBIBLZ2L.jpeg',
    ingredients: ['Hibiscus', 'Pineapple', 'Orange', 'Cranberry', 'Lemon', 'Jalapeño', 'Sea Moss', 'Agave'],
    benefits: ['Metabolism Boost', 'Circulation', 'Spicy Kick'],
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=spicy-bloom',
    featured: true,
    inStock: true,
    rewardPoints: 5
  }
];

// Helper functions
export const getProductBySlug = (slug) => {
  return PRODUCTS.find(p => p.slug === slug);
};

export const getProductsByCategory = (category) => {
  return PRODUCTS.filter(p => p.category === category);
};

export const getFeaturedProducts = () => {
  return PRODUCTS.filter(p => p.featured);
};

export const getInStockProducts = () => {
  return PRODUCTS.filter(p => p.inStock !== false);
};

// Export for backward compatibility
export default PRODUCTS;
