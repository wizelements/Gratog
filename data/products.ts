export type ProductCategory =
  | 'lemonades'
  | 'refreshers'
  | 'gels'
  | 'shots'
  | 'bundles'
  | 'inactive';

export type WeeklyStatus = 'active' | 'limited' | 'sold_out' | 'seasonal' | 'inactive';

export type InventoryStatus = 'in_stock' | 'limited' | 'sold_out' | 'preorder' | 'inactive';

export interface MarketProduct {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  weeklyStatus: WeeklyStatus;
  price: number;
  sizes: string[];
  ingredients: string[];
  shortDescription: string;
  fullDescription: string;
  flavorNotes: string;
  wellnessSupport: string[];
  recommendedUse: string;
  allergens: string[];
  pickupAvailability: string;
  shippingAvailability: string;
  inventoryStatus: InventoryStatus;
  featured: boolean;
  seasonal: boolean;
  image: string;
  seoTitle: string;
  seoDescription: string;
  activeWeeklyMenu: boolean;
  soldOut: boolean;
  preorderOnly: boolean;
  marketPickupOnly: boolean;
  squareProductUrl?: string;
  pairings?: string[];
  tags?: string[];
}

const FALLBACK_IMAGE = '/images/sea-moss-default.svg';

function archivedProduct(slug: string, name: string, reason: string): MarketProduct {
  return {
    id: `${slug}-archived`,
    slug,
    name,
    category: 'inactive',
    weeklyStatus: 'inactive',
    price: 0,
    sizes: [],
    ingredients: [],
    shortDescription: 'Archived product history. Not part of the current Taste of Gratitude weekly market menu.',
    fullDescription: reason,
    flavorNotes: 'Archived.',
    wellnessSupport: [],
    recommendedUse: 'Not currently available.',
    allergens: [],
    pickupAvailability: 'Inactive.',
    shippingAvailability: 'Inactive.',
    inventoryStatus: 'inactive',
    featured: false,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Archived Product | Taste of Gratitude',
    seoDescription: 'Archived Taste of Gratitude product.',
    activeWeeklyMenu: false,
    soldOut: true,
    preorderOnly: false,
    marketPickupOnly: false,
    tags: ['inactive', 'archived'],
  };
}

export const PRODUCTS: MarketProduct[] = [
  {
    id: 'kissed-by-gods',
    slug: 'kissed-by-gods',
    name: 'Kissed by Gods',
    category: 'lemonades',
    weeklyStatus: 'active',
    price: 11,
    sizes: ['16oz bottle'],
    ingredients: ['Basil', 'Chlorophyll', 'Ginger', 'Lemon', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'A bright green lemonade with basil, ginger, lemon, chlorophyll, and sea moss.',
    fullDescription: 'Kissed by Gods is the green drink customers ask about first at the market: herbaceous basil, zesty lemon, warming ginger, chlorophyll, and mineral-rich sea moss blended into a crisp lemonade that feels clean without tasting grassy.',
    flavorNotes: 'Fresh basil up front, bright lemon in the middle, and a gentle ginger finish.',
    wellnessSupport: ['Daily minerals', 'Hydration routine', 'Green reset', 'Gentle energy'],
    recommendedUse: 'Sip chilled in the morning, after a walk, or as your first green drink of the week.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly Atlanta-area market pickup while batches last.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'limited',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/FCXGGWWNRAR3ROIOPDBIO6M4.jpeg',
    seoTitle: 'Kissed by Gods Green Sea Moss Lemonade | Taste of Gratitude',
    seoDescription: 'Shop Kissed by Gods, a basil, chlorophyll, ginger, lemon, and sea moss lemonade made fresh for Atlanta farmers market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=kissed-by-gods',
    pairings: ['grateful-greens-gel', 'spicy-bloom'],
    tags: ['best-seller', 'green', 'minerals', 'hydration'],
  },
  {
    id: 'supplemint',
    slug: 'supplemint',
    name: 'Supplemint',
    category: 'lemonades',
    weeklyStatus: 'active',
    price: 11,
    sizes: ['16oz bottle'],
    ingredients: ['Mint', 'Ginger', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'Cool mint, ginger, sea moss, agave, and alkaline water in a crisp weekly lemonade.',
    fullDescription: 'Supplemint is the cooling reset: mint for a clean finish, ginger for a little spark, agave for balance, and sea moss blended in so the drink still fits a daily mineral routine.',
    flavorNotes: 'Cooling mint, lightly sweet agave, and a clean ginger finish.',
    wellnessSupport: ['Digestion routine', 'Hydration', 'Daily minerals', 'After-meal reset'],
    recommendedUse: 'Drink chilled after meals, during hot market days, or anytime you want a minty reset.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market preorder and Saturday pickup.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'in_stock',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/I47GEZOG7LWKFK5THGLJVCFP.jpeg',
    seoTitle: 'Supplemint Mint Ginger Sea Moss Lemonade | Taste of Gratitude',
    seoDescription: 'Supplemint blends mint, ginger, agave, and sea moss into a cooling lemonade for Atlanta market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=supplemint',
    pairings: ['healing-harmony-gel', 'grateful-defense'],
    tags: ['best-seller', 'mint', 'ginger', 'digestion'],
  },
  {
    id: 'strawberry-bliss',
    slug: 'strawberry-bliss',
    name: 'Strawberry Bliss',
    category: 'lemonades',
    weeklyStatus: 'active',
    price: 10,
    sizes: ['16oz bottle'],
    ingredients: ['Strawberry', 'Lemon', 'Ginger', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'A strawberry ginger lemonade with sea moss and a bright market-fresh finish.',
    fullDescription: 'Strawberry Bliss is the approachable crowd favorite: juicy strawberry, tart lemon, warming ginger, agave, and sea moss. It is easy for first-timers and familiar enough to become a weekly reorder.',
    flavorNotes: 'Juicy strawberry, tart lemonade, and soft ginger warmth.',
    wellnessSupport: ['Hydration', 'First-time sea moss option', 'Daily minerals', 'Sweet-tart refreshment'],
    recommendedUse: 'Start here if you are new to sea moss drinks or want a fruit-forward bottle for pickup.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market preorder and limited walk-up availability.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'limited',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/JNDX77PLQHLNWEZBUMELFA2P.jpeg',
    seoTitle: 'Strawberry Bliss Sea Moss Lemonade | Taste of Gratitude',
    seoDescription: 'Shop Strawberry Bliss, a strawberry, lemon, ginger, and sea moss lemonade made fresh for weekly Atlanta market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=strawberry-bliss',
    pairings: ['elderberry-apple-gel', 'spicy-bloom'],
    tags: ['best-seller', 'strawberry', 'first-timer', 'hydration'],
  },
  {
    id: 'black-minerals',
    slug: 'black-minerals',
    name: 'Black Minerals',
    category: 'lemonades',
    weeklyStatus: 'active',
    price: 12,
    sizes: ['16oz bottle'],
    ingredients: ['Lemon', 'Ginger', 'Sea Moss', 'Trace Mineral Blend', 'Agave', 'Alkaline Water'],
    shortDescription: 'A dark mineral lemonade for customers who want a bold daily reset.',
    fullDescription: 'Black Minerals is the bold one in the cooler: lemon, ginger, sea moss, alkaline water, and a trace mineral blend for customers who like their wellness drinks less sweet and more grounded.',
    flavorNotes: 'Bold mineral body, bright lemon, and warming ginger.',
    wellnessSupport: ['Daily minerals', 'Energy routine', 'Low-sweet reset', 'Weekly wellness ritual'],
    recommendedUse: 'Choose Black Minerals when you want a bolder bottle before work, after movement, or with your weekly gel.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market pickup while batches last.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'limited',
    featured: true,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Black Minerals Sea Moss Lemonade | Taste of Gratitude',
    seoDescription: 'Shop Black Minerals, a bold lemon, ginger, sea moss, and trace mineral lemonade for Atlanta farmers market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['grateful-greens-gel', 'grateful-defense'],
    tags: ['best-seller', 'minerals', 'ginger', 'reset'],
  },
  {
    id: 'calm-waters',
    slug: 'calm-waters',
    name: 'Calm Waters',
    category: 'lemonades',
    weeklyStatus: 'limited',
    price: 11,
    sizes: ['16oz bottle'],
    ingredients: ['Cucumber', 'Mint', 'Lemon', 'Blue Spirulina', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'Cucumber, mint, lemon, blue spirulina, and sea moss for a cooling bottle.',
    fullDescription: 'Calm Waters is a cool, easy-drinking bottle built for hot market days and slower evenings: cucumber, mint, lemon, blue spirulina, agave, and sea moss in an ocean-blue lemonade.',
    flavorNotes: 'Crisp cucumber, cool mint, soft citrus, and a light ocean-blue finish.',
    wellnessSupport: ['Hydration', 'Stress routine', 'Daily minerals', 'Cooling reset'],
    recommendedUse: 'Sip chilled during the afternoon or pair with a gel when you want a calmer weekly rhythm.',
    allergens: [],
    pickupAvailability: 'Limited weekly market batch; preorder is recommended.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'limited',
    featured: false,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Calm Waters Cucumber Mint Sea Moss Drink | Taste of Gratitude',
    seoDescription: 'Calm Waters is a cucumber, mint, lemon, blue spirulina, and sea moss drink made for weekly Atlanta pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['blue-lotus-gel', 'strawberry-rose-ginger'],
    tags: ['calm', 'hydration', 'mint', 'blue-spirulina'],
  },
  {
    id: 'peach-lemonade',
    slug: 'peach-lemonade',
    name: 'Peach Lemonade',
    category: 'lemonades',
    weeklyStatus: 'active',
    price: 11,
    sizes: ['16oz bottle'],
    ingredients: ['Peach', 'Lemon', 'Ginger', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'Georgia peach, lemon, ginger, sea moss, and agave in a seasonal lemonade.',
    fullDescription: 'Peach Lemonade brings the farmers market feeling into a bottle: ripe peach, tart lemon, ginger, sea moss, and agave. It is seasonal, sunny, and made for repeat weekly pickup.',
    flavorNotes: 'Ripe peach, tart lemon, and a smooth ginger finish.',
    wellnessSupport: ['Hydration', 'Seasonal fruit routine', 'Daily minerals'],
    recommendedUse: 'Drink cold at lunch, after market pickup, or as an easy first bottle for peach lovers.',
    allergens: [],
    pickupAvailability: 'Seasonal weekly batch while peaches are on the menu.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'in_stock',
    featured: false,
    seasonal: true,
    image: FALLBACK_IMAGE,
    seoTitle: 'Peach Sea Moss Lemonade | Taste of Gratitude',
    seoDescription: 'Peach Lemonade blends peach, lemon, ginger, sea moss, and agave for weekly Atlanta farmers market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['golden-glow-gel', 'spicy-bloom'],
    tags: ['peach', 'seasonal', 'lemonade'],
  },
  {
    id: 'peach-refresher',
    slug: 'peach-refresher',
    name: 'Peach Refresher',
    category: 'refreshers',
    weeklyStatus: 'active',
    price: 9,
    sizes: ['16oz bottle'],
    ingredients: ['Peach', 'Cucumber', 'Mint', 'Lime', 'Agave', 'Alkaline Water'],
    shortDescription: 'A lighter peach cucumber mint refresher for hot market days.',
    fullDescription: 'Peach Refresher is lighter than lemonade and built for hydration: peach, cucumber, mint, lime, agave, and alkaline water. It is a simple grab-and-go option for customers who want fruit without heaviness.',
    flavorNotes: 'Juicy peach, crisp cucumber, cool mint, and lime brightness.',
    wellnessSupport: ['Hydration', 'Light refreshment', 'Market-day routine'],
    recommendedUse: 'Choose this when you want a lighter bottle for walking the market or pairing with a gel.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market pickup while seasonal fruit is available.',
    shippingAvailability: 'Local pickup only for best freshness.',
    inventoryStatus: 'in_stock',
    featured: false,
    seasonal: true,
    image: FALLBACK_IMAGE,
    seoTitle: 'Peach Refresher | Taste of Gratitude',
    seoDescription: 'A peach, cucumber, mint, and lime refresher made in small batches for Atlanta market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['blue-lotus-gel', 'strawberry-bliss'],
    tags: ['peach', 'refresher', 'hydration'],
  },
  {
    id: 'peach-sea-moss-fizz',
    slug: 'peach-sea-moss-fizz',
    name: 'Peach Sea Moss Fizz',
    category: 'refreshers',
    weeklyStatus: 'limited',
    price: 10,
    sizes: ['16oz bottle'],
    ingredients: ['Peach', 'Lemon', 'Sea Moss', 'Agave', 'Sparkling Water'],
    shortDescription: 'A sparkling peach sea moss refresher with lemon and agave.',
    fullDescription: 'Peach Sea Moss Fizz is the celebratory bottle: sparkling water, peach, lemon, agave, and sea moss. It gives customers a lighter fizzy path into sea moss without feeling like a supplement.',
    flavorNotes: 'Sparkling peach, citrus lift, and a soft mineral finish.',
    wellnessSupport: ['Hydration', 'Sea moss first-timer option', 'Light refreshment'],
    recommendedUse: 'Sip cold at the market or save it for a weekend reset with your favorite gel.',
    allergens: [],
    pickupAvailability: 'Limited market-only batch; preorder is recommended.',
    shippingAvailability: 'Market pickup only due to carbonation and freshness.',
    inventoryStatus: 'limited',
    featured: false,
    seasonal: true,
    image: FALLBACK_IMAGE,
    seoTitle: 'Peach Sea Moss Fizz | Taste of Gratitude',
    seoDescription: 'A sparkling peach, lemon, agave, and sea moss refresher made for weekly Atlanta farmers market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['floral-tide-gel', 'spicy-bloom'],
    tags: ['peach', 'sparkling', 'refresher', 'sea-moss'],
  },
  {
    id: 'strawberry-rose-ginger',
    slug: 'strawberry-rose-ginger',
    name: 'Strawberry Rose Ginger',
    category: 'refreshers',
    weeklyStatus: 'active',
    price: 9,
    sizes: ['16oz bottle'],
    ingredients: ['Strawberry', 'Rose', 'Ginger', 'Lime', 'Agave', 'Alkaline Water'],
    shortDescription: 'A floral strawberry refresher with rose, ginger, lime, and agave.',
    fullDescription: 'Strawberry Rose Ginger is a soft floral refresher with enough ginger to keep it grounded. Strawberry and rose make it elegant; lime and ginger keep it bright for market-day sipping.',
    flavorNotes: 'Fresh strawberry, delicate rose, lime brightness, and ginger warmth.',
    wellnessSupport: ['Hydration', 'Skin/glow routine', 'Gentle energy'],
    recommendedUse: 'Pick this if you like floral fruit drinks or want a lighter option next to a gel.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market pickup while batches last.',
    shippingAvailability: 'Local pickup only for best freshness.',
    inventoryStatus: 'in_stock',
    featured: false,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Strawberry Rose Ginger Refresher | Taste of Gratitude',
    seoDescription: 'A strawberry, rose, ginger, and lime refresher made in small batches for Atlanta pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['floral-tide-gel', 'calm-waters'],
    tags: ['strawberry', 'rose', 'ginger', 'refresher'],
  },
  {
    id: 'cucumber-mint-ginger',
    slug: 'cucumber-mint-ginger',
    name: 'Cucumber Mint Ginger',
    category: 'refreshers',
    weeklyStatus: 'active',
    price: 9,
    sizes: ['16oz bottle'],
    ingredients: ['Cucumber', 'Mint', 'Ginger', 'Lime', 'Agave', 'Alkaline Water'],
    shortDescription: 'Cucumber, mint, ginger, and lime in a clean market refresher.',
    fullDescription: 'Cucumber Mint Ginger is the crispest refresher in the lineup. It is cool, bright, lightly sweet, and easy to drink when you want hydration without a heavy fruit profile.',
    flavorNotes: 'Cucumber crispness, mint chill, lime brightness, and a ginger finish.',
    wellnessSupport: ['Hydration', 'Digestion routine', 'Cooling reset'],
    recommendedUse: 'Sip chilled after lunch, during market walks, or whenever you want a low-sweet refresher.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market pickup while batches last.',
    shippingAvailability: 'Local pickup only for best freshness.',
    inventoryStatus: 'in_stock',
    featured: false,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Cucumber Mint Ginger Refresher | Taste of Gratitude',
    seoDescription: 'A cucumber, mint, ginger, and lime refresher made fresh for weekly Atlanta market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['supplemint', 'blue-lotus-gel'],
    tags: ['cucumber', 'mint', 'ginger', 'hydration'],
  },
  {
    id: 'electric-melon',
    slug: 'electric-melon',
    name: 'Electric Melon',
    category: 'refreshers',
    weeklyStatus: 'limited',
    price: 10,
    sizes: ['16oz bottle'],
    ingredients: ['Watermelon', 'Lime', 'Mint', 'Ginger', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'Watermelon, lime, mint, ginger, and sea moss in a bright refresher.',
    fullDescription: 'Electric Melon is made for heat, color, and movement: watermelon, lime, mint, ginger, sea moss, and agave. It is seasonal, vibrant, and intentionally limited.',
    flavorNotes: 'Juicy melon, sharp lime, cool mint, and a light ginger spark.',
    wellnessSupport: ['Hydration', 'Energy routine', 'Daily minerals'],
    recommendedUse: 'Choose it for hot market days, workouts, or a colorful first sea moss refresher.',
    allergens: [],
    pickupAvailability: 'Limited weekly batch; preorder is recommended.',
    shippingAvailability: 'Local pickup only for best freshness.',
    inventoryStatus: 'limited',
    featured: false,
    seasonal: true,
    image: FALLBACK_IMAGE,
    seoTitle: 'Electric Melon Sea Moss Refresher | Taste of Gratitude',
    seoDescription: 'Electric Melon blends watermelon, lime, mint, ginger, and sea moss for weekly Atlanta pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['golden-glow-gel', 'spicy-bloom'],
    tags: ['melon', 'seasonal', 'sea-moss', 'hydration'],
  },
  {
    id: 'vitamin-sea',
    slug: 'vitamin-sea',
    name: 'Vitamin Sea',
    category: 'refreshers',
    weeklyStatus: 'seasonal',
    price: 10,
    sizes: ['16oz bottle'],
    ingredients: ['Orange', 'Pineapple', 'Lemon', 'Ginger', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'A citrus-pineapple sea moss refresher preserved as a seasonal menu item.',
    fullDescription: 'Vitamin Sea is a citrus-forward refresher built around orange, pineapple, lemon, ginger, sea moss, and agave. It is kept in the product library for seasonal menu drops instead of being treated as always available.',
    flavorNotes: 'Orange brightness, pineapple sweetness, lemon tartness, and ginger lift.',
    wellnessSupport: ['Hydration', 'Seasonal citrus routine', 'Daily minerals'],
    recommendedUse: 'Watch for Vitamin Sea on seasonal menu weeks or ask at the market when citrus is featured.',
    allergens: [],
    pickupAvailability: 'Seasonal only; not always on the active weekly menu.',
    shippingAvailability: 'Local pickup recommended when active.',
    inventoryStatus: 'preorder',
    featured: false,
    seasonal: true,
    image: FALLBACK_IMAGE,
    seoTitle: 'Vitamin Sea Seasonal Sea Moss Refresher | Taste of Gratitude',
    seoDescription: 'Vitamin Sea is a seasonal citrus pineapple sea moss refresher from Taste of Gratitude.',
    activeWeeklyMenu: false,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    pairings: ['golden-glow-gel', 'grateful-defense'],
    tags: ['seasonal', 'citrus', 'sea-moss'],
  },
  {
    id: 'blue-lotus-gel',
    slug: 'blue-lotus-gel',
    name: 'Blue Lotus Gel',
    category: 'gels',
    weeklyStatus: 'active',
    price: 36,
    sizes: ['2oz sample', '16oz jar'],
    ingredients: ['Sea Moss', 'Blue Spirulina', 'Blue Lotus', 'Ashwagandha', 'Maca Root', 'Ginger', 'Agave', 'Alkaline Water'],
    shortDescription: 'A blue adaptogen-inspired sea moss gel for calm focus and evening rituals.',
    fullDescription: 'Blue Lotus Gel is a premium jar for customers who want a calmer sea moss ritual. Blue spirulina brings color, blue lotus and adaptogenic roots bring the routine story, and ginger/agave keep the spoonful balanced.',
    flavorNotes: 'Earthy-blue, lightly sweet, ginger-warm, and smooth.',
    wellnessSupport: ['Stress routine', 'Calm energy', 'Daily minerals', 'Evening ritual'],
    recommendedUse: 'Use 1–2 tablespoons in tea, smoothies, or as a chilled spoonful when you want a calmer routine.',
    allergens: [],
    pickupAvailability: 'Prepared in small weekly gel batches; preorder recommended.',
    shippingAvailability: 'Shipping may be available when cold-pack logistics are active; checkout confirms eligibility.',
    inventoryStatus: 'limited',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/5ICW6ZAQAEH3PGEZBWBDXFRQ.jpeg',
    seoTitle: 'Blue Lotus Sea Moss Gel | Taste of Gratitude',
    seoDescription: 'Blue Lotus Gel is a small-batch sea moss gel with blue spirulina, blue lotus, adaptogenic roots, ginger, and agave.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: false,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=blue-lotus',
    pairings: ['calm-waters', 'cucumber-mint-ginger'],
    tags: ['gel', 'blue-lotus', 'calm', 'adaptogen'],
  },
  {
    id: 'grateful-greens-gel',
    slug: 'grateful-greens-gel',
    name: 'Grateful Greens Gel',
    category: 'gels',
    weeklyStatus: 'active',
    price: 35,
    sizes: ['16oz jar'],
    ingredients: ['Sea Moss', 'Holy Basil', 'Spirulina', 'Chlorophyll', 'Chlorella', 'Local Honey', 'Alkaline Water'],
    shortDescription: 'A green sea moss gel with spirulina, chlorophyll, chlorella, holy basil, and honey.',
    fullDescription: 'Grateful Greens Gel is the jar for customers building a green daily routine. Sea moss, spirulina, chlorophyll, chlorella, holy basil, and local honey create an earthy-sweet gel that pairs well with smoothies and green drinks.',
    flavorNotes: 'Earthy greens, light honey sweetness, and a smooth mineral finish.',
    wellnessSupport: ['Daily minerals', 'Greens routine', 'Energy routine', 'Weight support routine'],
    recommendedUse: 'Blend into smoothies or take 1–2 tablespoons chilled with a green drink like Kissed by Gods.',
    allergens: ['Local honey'],
    pickupAvailability: 'Prepared in weekly gel batches; preorder recommended.',
    shippingAvailability: 'Shipping may be available when cold-pack logistics are active; checkout confirms eligibility.',
    inventoryStatus: 'limited',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/WZXG7JSUC2EYTSTJLERXRSYL.jpeg',
    seoTitle: 'Grateful Greens Sea Moss Gel | Taste of Gratitude',
    seoDescription: 'Grateful Greens Gel blends sea moss, spirulina, chlorophyll, chlorella, holy basil, and local honey for weekly pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: false,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=grateful-greens',
    pairings: ['kissed-by-gods', 'black-minerals', 'grateful-defense'],
    tags: ['gel', 'greens', 'minerals', 'daily'],
  },
  {
    id: 'healing-harmony-gel',
    slug: 'healing-harmony-gel',
    name: 'Healing Harmony Gel',
    category: 'gels',
    weeklyStatus: 'active',
    price: 35,
    sizes: ['16oz jar'],
    ingredients: ['Sea Moss', 'Soursop', 'Cinnamon', 'Star Anise', 'Alkaline Water'],
    shortDescription: 'A warm-spiced soursop sea moss gel with cinnamon and star anise.',
    fullDescription: 'Healing Harmony Gel is a warm, aromatic jar with soursop, cinnamon, star anise, sea moss, and alkaline water. It is comforting without being heavy and fits beautifully into teas, smoothies, and evening routines.',
    flavorNotes: 'Creamy soursop, warm cinnamon, aromatic anise, and a smooth finish.',
    wellnessSupport: ['Immune routine', 'Digestion routine', 'Evening ritual', 'Daily minerals'],
    recommendedUse: 'Add 1–2 tablespoons to tea, smoothies, oats, or take chilled when you want a cozy gel.',
    allergens: [],
    pickupAvailability: 'Prepared in weekly gel batches; preorder recommended.',
    shippingAvailability: 'Shipping may be available when cold-pack logistics are active; checkout confirms eligibility.',
    inventoryStatus: 'in_stock',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/ZHB653PNM4Q6HSEPML2YQRPP.jpeg',
    seoTitle: 'Healing Harmony Soursop Sea Moss Gel | Taste of Gratitude',
    seoDescription: 'Healing Harmony Gel blends sea moss, soursop, cinnamon, and star anise for a warm weekly wellness ritual.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: false,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=healing-harmony',
    pairings: ['supplemint', 'grateful-defense'],
    tags: ['gel', 'soursop', 'warm-spice', 'immune'],
  },
  {
    id: 'elderberry-apple-gel',
    slug: 'elderberry-apple-gel',
    name: 'Elderberry Apple Gel',
    category: 'gels',
    weeklyStatus: 'active',
    price: 36,
    sizes: ['16oz jar'],
    ingredients: ['Sea Moss', 'Elderberry', 'Apple', 'Ginger', 'Lemon', 'Alkaline Water'],
    shortDescription: 'Elderberry, apple, ginger, lemon, and sea moss in a fruit-forward gel.',
    fullDescription: 'Elderberry Apple Gel is a fruit-forward jar for weekly immune-season routines. Elderberry and apple make it familiar, ginger and lemon keep it bright, and sea moss anchors the gel in the Taste of Gratitude mineral ritual.',
    flavorNotes: 'Deep berry, apple sweetness, lemon brightness, and ginger warmth.',
    wellnessSupport: ['Immune routine', 'Daily minerals', 'Family-friendly flavor'],
    recommendedUse: 'Take chilled by the spoonful or blend into smoothies when you want a berry-forward gel.',
    allergens: [],
    pickupAvailability: 'Prepared in weekly gel batches; preorder recommended.',
    shippingAvailability: 'Shipping may be available when cold-pack logistics are active; checkout confirms eligibility.',
    inventoryStatus: 'in_stock',
    featured: false,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/CPFQJP5N2DGVL5US32BI5WFV.jpeg',
    seoTitle: 'Elderberry Apple Sea Moss Gel | Taste of Gratitude',
    seoDescription: 'Elderberry Apple Gel combines sea moss, elderberry, apple, ginger, and lemon for weekly Atlanta market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: false,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=elderberry-moss',
    pairings: ['strawberry-bliss', 'grateful-defense'],
    tags: ['gel', 'elderberry', 'apple', 'immune'],
  },
  {
    id: 'golden-glow-gel',
    slug: 'golden-glow-gel',
    name: 'Golden Glow Gel',
    category: 'gels',
    weeklyStatus: 'active',
    price: 36,
    sizes: ['2oz sample', '16oz jar'],
    ingredients: ['Sea Moss', 'Pineapple', 'Orange', 'Turmeric', 'Ginger', 'Local Honey', 'Alkaline Water'],
    shortDescription: 'Pineapple, orange, turmeric, ginger, honey, and sea moss in a golden gel.',
    fullDescription: 'Golden Glow Gel is a bright turmeric-ginger jar made for customers who want a radiant daily spoonful. Pineapple and orange keep it sunny, turmeric and ginger bring warmth, and local honey rounds it out.',
    flavorNotes: 'Tropical citrus, turmeric warmth, ginger lift, and honey sweetness.',
    wellnessSupport: ['Skin/glow routine', 'Recovery routine', 'Daily minerals', 'Morning ritual'],
    recommendedUse: 'Blend into smoothies, take chilled before the day starts, or pair with peach or melon drinks.',
    allergens: ['Local honey'],
    pickupAvailability: 'Prepared in weekly gel batches; preorder recommended.',
    shippingAvailability: 'Shipping may be available when cold-pack logistics are active; checkout confirms eligibility.',
    inventoryStatus: 'limited',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/IB23YBEFP6SBAIOEWT4L5ARY.jpeg',
    seoTitle: 'Golden Glow Turmeric Ginger Sea Moss Gel | Taste of Gratitude',
    seoDescription: 'Golden Glow Gel blends sea moss, pineapple, orange, turmeric, ginger, and local honey for weekly pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: false,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=golden-glow-gel',
    pairings: ['peach-lemonade', 'electric-melon', 'spicy-bloom'],
    tags: ['gel', 'turmeric', 'ginger', 'glow'],
  },
  {
    id: 'floral-tide-gel',
    slug: 'floral-tide-gel',
    name: 'Floral Tide Gel',
    category: 'gels',
    weeklyStatus: 'active',
    price: 36,
    sizes: ['2oz sample', '16oz jar'],
    ingredients: ['Sea Moss', 'Hibiscus', 'Cranberry', 'Pineapple', 'Orange', 'Turmeric', 'Ginger', 'Lemon', 'Agave', 'Bee Pollen', 'Alkaline Water'],
    shortDescription: 'A hibiscus-cranberry sea moss gel with citrus, ginger, turmeric, and bee pollen.',
    fullDescription: 'Floral Tide Gel is the bold floral jar: hibiscus, cranberry, pineapple, orange, lemon, turmeric, ginger, agave, bee pollen, and sea moss. It is tart, colorful, and made for customers who like layered flavor.',
    flavorNotes: 'Tart hibiscus, cranberry depth, citrus brightness, and ginger warmth.',
    wellnessSupport: ['Skin/glow routine', 'Immune routine', 'Daily minerals', 'Flavor adventure'],
    recommendedUse: 'Take chilled, blend into berry smoothies, or pair with Strawberry Rose Ginger for a floral routine.',
    allergens: ['Bee pollen'],
    pickupAvailability: 'Prepared in weekly gel batches; preorder recommended.',
    shippingAvailability: 'Shipping may be available when cold-pack logistics are active; checkout confirms eligibility.',
    inventoryStatus: 'limited',
    featured: false,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/BCT7OKTLSDWU3WW7P45AOHVK.jpeg',
    seoTitle: 'Floral Tide Hibiscus Sea Moss Gel | Taste of Gratitude',
    seoDescription: 'Floral Tide Gel is a hibiscus, cranberry, citrus, ginger, turmeric, bee pollen, and sea moss gel for weekly pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: false,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=floral-tide',
    pairings: ['strawberry-rose-ginger', 'peach-sea-moss-fizz'],
    tags: ['gel', 'hibiscus', 'floral', 'cranberry'],
  },
  {
    id: 'spicy-bloom',
    slug: 'spicy-bloom',
    name: 'Spicy Bloom',
    category: 'shots',
    weeklyStatus: 'active',
    price: 5,
    sizes: ['2oz shot'],
    ingredients: ['Hibiscus', 'Pineapple', 'Orange', 'Cranberry', 'Lemon', 'Jalapeño', 'Sea Moss', 'Agave', 'Alkaline Water'],
    shortDescription: 'A tart floral wellness shot with jalapeño heat, citrus, cranberry, hibiscus, and sea moss.',
    fullDescription: 'Spicy Bloom is the quick market wake-up: tart hibiscus and cranberry, tropical pineapple and orange, lemon, jalapeño heat, agave, and sea moss. It is small but memorable.',
    flavorNotes: 'Tart floral fruit with a jalapeño finish.',
    wellnessSupport: ['Energy routine', 'Immune routine', 'Quick reset', 'Daily minerals'],
    recommendedUse: 'Take chilled as a 2oz shot before a busy day or pair it with a sweeter lemonade.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market pickup; limited shot batches move quickly.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'in_stock',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/EJ3LK4ECIAME3LAUHBIBLZ2L.jpeg',
    seoTitle: 'Spicy Bloom Wellness Shot | Taste of Gratitude',
    seoDescription: 'Spicy Bloom is a hibiscus, citrus, cranberry, jalapeño, and sea moss wellness shot for weekly Atlanta market pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=spicy-bloom',
    pairings: ['strawberry-bliss', 'golden-glow-gel'],
    tags: ['shot', 'spicy', 'hibiscus', 'energy'],
  },
  {
    id: 'grateful-defense',
    slug: 'grateful-defense',
    name: 'Grateful Defense',
    category: 'shots',
    weeklyStatus: 'active',
    price: 5,
    sizes: ['2oz shot'],
    ingredients: ['Elderberry', 'Cranberry', 'Apple', 'Ginger', 'Lemon', 'Echinacea', 'Sea Moss', 'Alkaline Water'],
    shortDescription: 'An elderberry, echinacea, ginger, lemon, cranberry, apple, and sea moss shot.',
    fullDescription: 'Grateful Defense is the grab-and-go shot for immune-season routines: elderberry, cranberry, apple, ginger, lemon, echinacea, sea moss, and alkaline water in a concentrated 2oz bottle.',
    flavorNotes: 'Deep berry, tart cranberry, lemon brightness, and a ginger finish.',
    wellnessSupport: ['Immune routine', 'Daily minerals', 'Travel-day routine', 'Quick reset'],
    recommendedUse: 'Take chilled before errands, travel, market days, or whenever you want a quick elderberry-forward shot.',
    allergens: [],
    pickupAvailability: 'Prepared for weekly market pickup; limited shot batches move quickly.',
    shippingAvailability: 'Local pickup recommended; shipping eligibility is confirmed at checkout.',
    inventoryStatus: 'in_stock',
    featured: true,
    seasonal: false,
    image: 'https://127690646.cdn6.editmysite.com/uploads/1/2/7/6/127690646/7G2QSRNEWAACVG3DXL27W7KO.jpeg',
    seoTitle: 'Grateful Defense Elderberry Sea Moss Shot | Taste of Gratitude',
    seoDescription: 'Grateful Defense is an elderberry, cranberry, apple, ginger, lemon, echinacea, and sea moss shot for Atlanta pickup.',
    activeWeeklyMenu: true,
    soldOut: false,
    preorderOnly: true,
    marketPickupOnly: true,
    squareProductUrl: 'https://tasteofgratitude.shop/s/order?add=gratitude-defense',
    pairings: ['elderberry-apple-gel', 'supplemint', 'black-minerals'],
    tags: ['shot', 'elderberry', 'immune', 'ginger'],
  },
  {
    id: 'boba-discontinued',
    slug: 'boba',
    name: 'Boba',
    category: 'inactive',
    weeklyStatus: 'inactive',
    price: 0,
    sizes: [],
    ingredients: [],
    shortDescription: 'Archived product history. Not part of the current Taste of Gratitude weekly menu.',
    fullDescription: 'Boba is intentionally archived so old catalog entries do not appear in the active weekly market menu.',
    flavorNotes: 'Archived.',
    wellnessSupport: [],
    recommendedUse: 'Not currently available.',
    allergens: [],
    pickupAvailability: 'Inactive.',
    shippingAvailability: 'Inactive.',
    inventoryStatus: 'inactive',
    featured: false,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Archived Product | Taste of Gratitude',
    seoDescription: 'Archived Taste of Gratitude product.',
    activeWeeklyMenu: false,
    soldOut: true,
    preorderOnly: false,
    marketPickupOnly: false,
    tags: ['inactive', 'archived'],
  },
  {
    id: 'taro-discontinued',
    slug: 'taro',
    name: 'Taro',
    category: 'inactive',
    weeklyStatus: 'inactive',
    price: 0,
    sizes: [],
    ingredients: [],
    shortDescription: 'Archived product history. Not part of the current weekly wellness menu.',
    fullDescription: 'Taro is intentionally archived so stale catalog entries do not drift into the active storefront.',
    flavorNotes: 'Archived.',
    wellnessSupport: [],
    recommendedUse: 'Not currently available.',
    allergens: [],
    pickupAvailability: 'Inactive.',
    shippingAvailability: 'Inactive.',
    inventoryStatus: 'inactive',
    featured: false,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Archived Product | Taste of Gratitude',
    seoDescription: 'Archived Taste of Gratitude product.',
    activeWeeklyMenu: false,
    soldOut: true,
    preorderOnly: false,
    marketPickupOnly: false,
    tags: ['inactive', 'archived'],
  },
  {
    id: 'matcha-discontinued',
    slug: 'matcha',
    name: 'Matcha',
    category: 'inactive',
    weeklyStatus: 'inactive',
    price: 0,
    sizes: [],
    ingredients: [],
    shortDescription: 'Archived product history. Not part of the current weekly wellness menu.',
    fullDescription: 'Matcha is intentionally archived so discontinued cafe-style products do not appear in the active market funnel.',
    flavorNotes: 'Archived.',
    wellnessSupport: [],
    recommendedUse: 'Not currently available.',
    allergens: [],
    pickupAvailability: 'Inactive.',
    shippingAvailability: 'Inactive.',
    inventoryStatus: 'inactive',
    featured: false,
    seasonal: false,
    image: FALLBACK_IMAGE,
    seoTitle: 'Archived Product | Taste of Gratitude',
    seoDescription: 'Archived Taste of Gratitude product.',
    activeWeeklyMenu: false,
    soldOut: true,
    preorderOnly: false,
    marketPickupOnly: false,
    tags: ['inactive', 'archived'],
  },
  archivedProduct('elderberry-moss', 'Elderberry Moss', 'Elderberry Moss is archived as legacy catalog history. Elderberry Apple Gel is the current active elderberry gel path.'),
  archivedProduct('pineapple-basil', 'Pineapple Basil', 'Pineapple Basil is archived as an older seasonal drink so it does not appear in the active weekly menu.'),
  archivedProduct('apple-cranberry', 'Apple Cranberry', 'Apple Cranberry is archived as an older seasonal drink so current refreshers stay accurate.'),
  archivedProduct('grateful-guardian', 'Grateful Guardian', 'Grateful Guardian is archived as legacy product history. Grateful Defense is the current shot positioned for immune-season routines.'),
  archivedProduct('rejuvenate', 'Rejuvenate', 'Rejuvenate is archived as a discontinued catalog item and should not appear in the current weekly market menu.'),
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  lemonades: 'Lemonades & Drinks',
  refreshers: 'Refreshers',
  gels: 'Sea Moss Gels',
  shots: 'Wellness Shots',
  bundles: 'Bundles',
  inactive: 'Archived',
};

const CATEGORY_ICONS: Record<ProductCategory, string> = {
  lemonades: '🍋',
  refreshers: '🍹',
  gels: '🌿',
  shots: '⚡',
  bundles: '🎁',
  inactive: '🗄️',
};

const TAXONOMY_CATEGORY_LABELS: Record<ProductCategory, string> = {
  lemonades: 'Lemonades & Juices',
  refreshers: 'Refreshers',
  gels: 'Sea Moss Gels',
  shots: 'Wellness Shots',
  bundles: 'Bundles & Seasonal',
  inactive: 'Archived',
};

const WELLNESS_TO_PRODUCT_IDS: Record<string, string[]> = {
  digestion: ['supplemint', 'cucumber-mint-ginger', 'healing-harmony-gel'],
  energy: ['kissed-by-gods', 'black-minerals', 'spicy-bloom'],
  immunity: ['grateful-defense', 'elderberry-apple-gel', 'healing-harmony-gel'],
  'skin/glow': ['golden-glow-gel', 'floral-tide-gel', 'strawberry-rose-ginger'],
  stress: ['blue-lotus-gel', 'calm-waters', 'cucumber-mint-ginger'],
  hydration: ['calm-waters', 'electric-melon', 'peach-refresher'],
  'weight support': ['grateful-greens-gel', 'black-minerals', 'kissed-by-gods'],
  'daily minerals': ['grateful-greens-gel', 'kissed-by-gods', 'black-minerals'],
};

export function normalizeProductKey(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export function getAllProducts() {
  return PRODUCTS;
}

export function getActiveProducts() {
  return PRODUCTS.filter((product) => product.weeklyStatus !== 'inactive');
}

export function getActiveWeeklyProducts({ includeSoldOut = true } = {}) {
  return PRODUCTS.filter((product) => {
    if (!product.activeWeeklyMenu) return false;
    if (!includeSoldOut && product.soldOut) return false;
    return product.weeklyStatus !== 'inactive';
  });
}

export function getFeaturedProducts() {
  return getActiveProducts().filter((product) => product.featured);
}

export function getBestSellerProducts() {
  const ids = ['kissed-by-gods', 'supplemint', 'strawberry-bliss', 'black-minerals'];
  return ids.map((id) => getProductBySlugOrId(id)).filter(Boolean) as MarketProduct[];
}

export function getInactiveProducts() {
  return PRODUCTS.filter((product) => product.weeklyStatus === 'inactive');
}

export function getProductBySlugOrId(value: unknown) {
  const key = normalizeProductKey(value);
  if (!key) return null;
  return PRODUCTS.find((product) => normalizeProductKey(product.slug) === key || normalizeProductKey(product.id) === key) || null;
}

export const getProductBySlug = getProductBySlugOrId;

export function getProductByName(value: unknown) {
  const key = normalizeProductKey(value);
  if (!key) return null;
  return PRODUCTS.find((product) => normalizeProductKey(product.name) === key) || null;
}

export function getProductsByCategory(category: ProductCategory | string) {
  return getActiveProducts().filter((product) => product.category === category);
}

export function getInStockProducts() {
  return getActiveProducts().filter((product) => !product.soldOut && product.inventoryStatus !== 'sold_out');
}

export function getRecommendedProductsForGoal(goal: string) {
  const ids = WELLNESS_TO_PRODUCT_IDS[goal] || WELLNESS_TO_PRODUCT_IDS['daily minerals'];
  return ids.map((id) => getProductBySlugOrId(id)).filter(Boolean) as MarketProduct[];
}

export function getCategoryLabel(category: ProductCategory | string) {
  return CATEGORY_LABELS[category as ProductCategory] || String(category || 'Wellness');
}

export function getCategoryIcon(category: ProductCategory | string) {
  return CATEGORY_ICONS[category as ProductCategory] || '🌿';
}

export function getTaxonomyCategoryLabel(category: ProductCategory | string) {
  return TAXONOMY_CATEGORY_LABELS[category as ProductCategory] || getCategoryLabel(category);
}

export function isInactiveCatalogItem(product: { id?: unknown; slug?: unknown; name?: unknown }) {
  const keys = [product.id, product.slug, product.name].map(normalizeProductKey).filter(Boolean);
  if (keys.length === 0) return false;

  return getInactiveProducts().some((inactive) => {
    const inactiveKeys = [inactive.id, inactive.slug, inactive.name].map(normalizeProductKey);
    return keys.some((key) => inactiveKeys.some((inactiveKey) => key === inactiveKey || key.includes(inactiveKey)));
  });
}

function localVariationId(product: MarketProduct, index = 0) {
  return `tog-${index}-${normalizeProductKey(product.id).slice(0, 9)}`;
}

export function toStorefrontProduct(product: MarketProduct, index = 0) {
  const variationId = localVariationId(product, index);
  const categoryLabel = getCategoryLabel(product.category);
  const taxonomyCategoryLabel = getTaxonomyCategoryLabel(product.category);
  const categoryIcon = getCategoryIcon(product.category);
  const stock = product.inventoryStatus === 'sold_out' || product.soldOut ? 0 : product.inventoryStatus === 'limited' ? 4 : 20;

  return {
    ...product,
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    categoryLabel,
    displayCategory: categoryLabel,
    intelligentCategory: taxonomyCategoryLabel,
    description: product.shortDescription,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    productStory: product.fullDescription,
    flavorProfile: product.flavorNotes,
    flavorNotes: product.flavorNotes,
    intendedUse: product.wellnessSupport.join(', '),
    howToUse: product.recommendedUse,
    usageInstructions: product.recommendedUse,
    storageInstructions: product.category === 'gels'
      ? 'Keep refrigerated. Use a clean spoon and enjoy within the freshness window on the label.'
      : 'Keep refrigerated and drink chilled for best flavor.',
    price: product.price,
    priceCents: Math.round(product.price * 100),
    size: product.sizes[0] || 'Market item',
    image: product.image,
    images: [product.image].filter(Boolean),
    imageAlt: `${product.name} from Taste of Gratitude`,
    stock,
    inStock: stock > 0,
    isPreorder: product.preorderOnly || product.inventoryStatus === 'preorder',
    marketExclusive: product.marketPickupOnly,
    activeWeeklyMenu: product.activeWeeklyMenu,
    soldOut: product.soldOut,
    preorderOnly: product.preorderOnly,
    marketPickupOnly: product.marketPickupOnly,
    seasonal: product.seasonal,
    pickupAvailability: product.pickupAvailability,
    shippingAvailability: product.shippingAvailability,
    inventoryStatus: product.inventoryStatus,
    wellnessSupport: product.wellnessSupport,
    recommendedUse: product.recommendedUse,
    allergens: product.allergens,
    pairings: product.pairings || [],
    benefits: product.wellnessSupport,
    benefitStory: product.shortDescription,
    tags: product.tags || [],
    ingredients: product.ingredients.map((ingredient) => ({ name: ingredient })),
    categoryData: {
      name: taxonomyCategoryLabel,
      label: categoryLabel,
      icon: categoryIcon,
      description: `${categoryLabel} from the weekly Taste of Gratitude market menu`,
    },
    variations: product.sizes.length > 0
      ? product.sizes.map((size, sizeIndex) => ({
          id: localVariationId(product, sizeIndex),
          name: size,
          price: size.toLowerCase().includes('2oz') && product.category === 'gels' ? 11 : product.price,
          priceCents: Math.round((size.toLowerCase().includes('2oz') && product.category === 'gels' ? 11 : product.price) * 100),
        }))
      : [{ id: variationId, name: 'Market item', price: product.price, priceCents: Math.round(product.price * 100) }],
    variationId,
    catalogObjectId: undefined,
    checkoutReady: false,
    checkoutUnavailableReason: 'This weekly market item is not connected to live Square checkout yet. Join weekly texts or ask at the market for current availability.',
    squareData: product.squareProductUrl ? { productUrl: product.squareProductUrl } : undefined,
    source: 'curated_weekly_market',
  };
}

export function mergeWithCuratedProduct<T extends Record<string, any>>(liveProduct: T, index = 0) {
  const curated =
    getProductBySlugOrId(liveProduct.slug || liveProduct.id) ||
    getProductByName(liveProduct.name);

  if (!curated) return liveProduct;

  const curatedProduct = toStorefrontProduct(curated, index);
  const liveVariations = Array.isArray(liveProduct.variations) && liveProduct.variations.length > 0
    ? liveProduct.variations
    : curatedProduct.variations;
  const liveImages = Array.isArray(liveProduct.images) && liveProduct.images.length > 0
    ? liveProduct.images
    : curatedProduct.images;
  const liveImage = liveProduct.image || liveProduct.displayImage || curatedProduct.image;
  const livePrice = typeof liveProduct.price === 'number' && liveProduct.price > 0
    ? liveProduct.price
    : curatedProduct.price;
  const firstLiveVariationId = liveVariations?.[0]?.id;
  const resolvedLiveVariationId =
    liveProduct.variationId ||
    liveProduct.catalogObjectId ||
    liveProduct.squareVariationId ||
    liveProduct.squareData?.variationId ||
    firstLiveVariationId ||
    null;
  const checkoutReady = liveProduct.checkoutReady === true || Boolean(
    resolvedLiveVariationId && !String(resolvedLiveVariationId).startsWith('tog-')
  );

  return {
    ...liveProduct,
    curatedProductId: curated.id,
    slug: curated.slug || liveProduct.slug,
    name: curated.name || liveProduct.name,
    category: curatedProduct.category,
    categoryLabel: curatedProduct.categoryLabel,
    displayCategory: curatedProduct.displayCategory,
    intelligentCategory: curatedProduct.intelligentCategory,
    categoryData: curatedProduct.categoryData,
    description: curated.shortDescription,
    shortDescription: curated.shortDescription,
    fullDescription: curated.fullDescription,
    productStory: curated.fullDescription,
    story: curated.fullDescription,
    flavorProfile: curated.flavorNotes,
    flavorNotes: curated.flavorNotes,
    intendedUse: curated.wellnessSupport.join(', '),
    howToUse: curated.recommendedUse,
    usageInstructions: curated.recommendedUse,
    pickupAvailability: curated.pickupAvailability,
    shippingAvailability: curated.shippingAvailability,
    inventoryStatus: curated.inventoryStatus,
    weeklyStatus: curated.weeklyStatus,
    wellnessSupport: curated.wellnessSupport,
    recommendedUse: curated.recommendedUse,
    allergens: curated.allergens,
    pairings: curated.pairings || [],
    benefits: curated.wellnessSupport,
    benefitStory: curated.shortDescription,
    tags: Array.from(new Set([...(liveProduct.tags || []), ...(curated.tags || [])])),
    ingredients: curatedProduct.ingredients,
    image: liveImage,
    images: liveImages,
    imageAlt: `${curated.name} from Taste of Gratitude`,
    price: livePrice,
    priceCents: liveProduct.priceCents || Math.round(livePrice * 100),
    variations: liveVariations,
    variationId: resolvedLiveVariationId || curatedProduct.variationId,
    catalogObjectId: liveProduct.catalogObjectId || resolvedLiveVariationId || curatedProduct.catalogObjectId,
    checkoutReady,
    checkoutUnavailableReason: checkoutReady ? undefined : curatedProduct.checkoutUnavailableReason,
    activeWeeklyMenu: curated.activeWeeklyMenu,
    soldOut: curated.soldOut,
    preorderOnly: curated.preorderOnly,
    marketPickupOnly: curated.marketPickupOnly,
    seasonal: curated.seasonal,
    stock: curated.soldOut ? 0 : liveProduct.stock ?? curatedProduct.stock,
    inStock: curated.soldOut ? false : liveProduct.inStock ?? curatedProduct.inStock,
    isPreorder: liveProduct.isPreorder ?? curatedProduct.isPreorder,
    marketExclusive: liveProduct.marketExclusive ?? curated.marketPickupOnly,
    seoTitle: curated.seoTitle,
    seoDescription: curated.seoDescription,
  };
}

export function getCuratedStorefrontProducts() {
  return getActiveProducts().map((product, index) => toStorefrontProduct(product, index));
}

export function getActiveWeeklyStorefrontProducts() {
  return getActiveWeeklyProducts().map((product, index) => toStorefrontProduct(product, index));
}

export default PRODUCTS;
