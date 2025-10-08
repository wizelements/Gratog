// Product catalog - prices are in cents (server-side source of truth)
export const PRODUCTS = [
  {
    id: 'elderberry-sea-moss-16oz',
    slug: 'elderberry-sea-moss',
    name: 'Sea Moss Gel — Elderberry',
    subtitle: 'Elderberry • Echinacea • Apple • Ginger',
    description: 'Our signature sea moss gel infused with immune-boosting elderberry, echinacea, sweet apple, and warming ginger. A delicious way to support your wellness journey.',
    image: 'https://images.unsplash.com/photo-1629240811918-d92da93a93ad?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwzfHx3ZWxsbmVzcyUyMGphcnxlbnwwfHx8fDE3NTk4OTMxODF8MA&ixlib=rb-4.1.0&q=85',
    price: 3500, // $35.00 in cents
    size: '16oz',
    ingredients: ['Elderberry', 'Echinacea', 'Apple', 'Ginger', 'Sea Moss', 'Spring Water'],
    benefits: ['Immune Support', 'Rich in Minerals', 'Anti-inflammatory', 'Natural Energy'],
    featured: true
  },
  {
    id: 'original-sea-moss-16oz',
    slug: 'original-sea-moss',
    name: 'Sea Moss Gel — Original',
    subtitle: 'Pure & Simple',
    description: 'Pure wildcrafted sea moss gel with nothing added. Experience the ocean\'s gift in its most natural form.',
    image: 'https://images.unsplash.com/photo-1599536884823-1bc4fb5f9dea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHx3ZWxsbmVzcyUyMGphcnxlbnwwfHx8fDE3NTk4OTMxODF8MA&ixlib=rb-4.1.0&q=85',
    price: 3000, // $30.00 in cents
    size: '16oz',
    ingredients: ['Wildcrafted Sea Moss', 'Spring Water'],
    benefits: ['92 Essential Minerals', 'Digestive Health', 'Thyroid Support', 'Skin Health'],
    featured: true
  },
  {
    id: 'ginger-turmeric-sea-moss-16oz',
    slug: 'ginger-turmeric-sea-moss',
    name: 'Sea Moss Gel — Ginger Turmeric',
    subtitle: 'Ginger • Turmeric • Black Pepper',
    description: 'A powerful anti-inflammatory blend featuring warming ginger, golden turmeric, and black pepper for enhanced absorption.',
    image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxuYXR1cmFsJTIwaW5ncmVkaWVudHN8ZW58MHx8fHwxNzU5ODkzMTk0fDA&ixlib=rb-4.1.0&q=85',
    price: 3500, // $35.00 in cents
    size: '16oz',
    ingredients: ['Ginger', 'Turmeric', 'Black Pepper', 'Sea Moss', 'Spring Water'],
    benefits: ['Anti-inflammatory', 'Joint Health', 'Digestive Support', 'Antioxidant Rich'],
    featured: true
  },
  {
    id: 'blueberry-sea-moss-16oz',
    slug: 'blueberry-sea-moss',
    name: 'Sea Moss Gel — Blueberry',
    subtitle: 'Wild Blueberry • Lemon',
    description: 'Antioxidant-rich wild blueberries combined with bright lemon and nutrient-dense sea moss for a delicious superfood boost.',
    image: 'https://images.unsplash.com/photo-1629240811918-d92da93a93ad?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwzfHx3ZWxsbmVzcyUyMGphcnxlbnwwfHx8fDE3NTk4OTMxODF8MA&ixlib=rb-4.1.0&q=85',
    price: 3500, // $35.00 in cents
    size: '16oz',
    ingredients: ['Wild Blueberry', 'Lemon', 'Sea Moss', 'Spring Water'],
    benefits: ['Brain Health', 'Antioxidants', 'Vision Support', 'Immune Boost'],
    featured: false
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

export function getProductBySlug(slug) {
  return PRODUCTS.find(p => p.slug === slug);
}

export function getFeaturedProducts() {
  return PRODUCTS.filter(p => p.featured);
}
