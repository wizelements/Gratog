import { isLikelyImageReference, isPlaceholderLikeImage } from '@/lib/storefront-integrity';

export type ProductVisualMode = 'photo' | 'flavor-art';
export type ProductVessel = 'bottle' | 'jar' | 'shot' | 'cup' | 'bundle';

export interface ProductVisualProfile {
  mode: ProductVisualMode;
  src: string;
  alt: string;
  monogram: string;
  vessel: ProductVessel;
  eyebrow: string;
  ingredients: string[];
  background: string;
  glow: string;
  foreground: string;
  accent: string;
  confidence: 'verified' | 'derived';
}

type ProductLike = {
  name?: unknown;
  category?: unknown;
  image?: unknown;
  displayImage?: unknown;
  images?: unknown;
  imageAlt?: unknown;
  ingredients?: unknown;
  tags?: unknown;
  imageStatus?: unknown;
};

type Palette = {
  background: string;
  glow: string;
  foreground: string;
  accent: string;
};

const PALETTES: Array<{ tokens: string[]; palette: Palette }> = [
  {
    tokens: ['black', 'mineral', 'charcoal'],
    palette: {
      background: 'linear-gradient(145deg, #08110f 0%, #17251f 52%, #6f5b2f 100%)',
      glow: 'rgba(244, 196, 98, 0.32)',
      foreground: '#fffdf5',
      accent: '#f2cb76',
    },
  },
  {
    tokens: ['calm', 'blue', 'spirulina', 'cucumber', 'mint'],
    palette: {
      background: 'linear-gradient(145deg, #063746 0%, #0f7180 48%, #b7e4d2 100%)',
      glow: 'rgba(207, 250, 254, 0.34)',
      foreground: '#f4fffd',
      accent: '#c5f4e6',
    },
  },
  {
    tokens: ['strawberry', 'rose', 'berry', 'elderberry', 'cranberry', 'hibiscus'],
    palette: {
      background: 'linear-gradient(145deg, #50162d 0%, #a52f50 50%, #f0a7b6 100%)',
      glow: 'rgba(255, 228, 230, 0.34)',
      foreground: '#fff8f8',
      accent: '#ffd5dd',
    },
  },
  {
    tokens: ['melon', 'watermelon'],
    palette: {
      background: 'linear-gradient(145deg, #651f36 0%, #dd665d 50%, #7fa35d 100%)',
      glow: 'rgba(254, 226, 226, 0.32)',
      foreground: '#fffaf5',
      accent: '#dff0b8',
    },
  },
  {
    tokens: ['peach', 'mango', 'pineapple', 'tropical'],
    palette: {
      background: 'linear-gradient(145deg, #7c2d12 0%, #f08b3e 48%, #f7cf73 100%)',
      glow: 'rgba(255, 247, 214, 0.34)',
      foreground: '#fffaf2',
      accent: '#fff0b8',
    },
  },
  {
    tokens: ['lemon', 'citrus', 'lime'],
    palette: {
      background: 'linear-gradient(145deg, #355415 0%, #78a22e 48%, #e6cf4c 100%)',
      glow: 'rgba(254, 249, 195, 0.36)',
      foreground: '#fffef2',
      accent: '#fff3a5',
    },
  },
  {
    tokens: ['ginger', 'golden', 'turmeric', 'chai'],
    palette: {
      background: 'linear-gradient(145deg, #5a3514 0%, #a9661f 50%, #efc15d 100%)',
      glow: 'rgba(254, 243, 199, 0.32)',
      foreground: '#fffaf0',
      accent: '#ffe3a3',
    },
  },
];

const DEFAULT_PALETTE: Palette = {
  background: 'linear-gradient(145deg, #073b2b 0%, #0f6b4f 50%, #7fb89f 100%)',
  glow: 'rgba(209, 250, 229, 0.34)',
  foreground: '#f7fffb',
  accent: '#c9f4df',
};

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function imageCandidate(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'url' in value) {
    return clean((value as { url?: unknown }).url);
  }
  return '';
}

function collectImageCandidates(product: ProductLike): string[] {
  const images = Array.isArray(product.images) ? product.images : [];
  return [product.displayImage, product.image, ...images]
    .map(imageCandidate)
    .filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
}

export function getTrustedProductImages(product: ProductLike): string[] {
  const explicitStatus = clean(product.imageStatus).toLowerCase();
  if (explicitStatus === 'missing') return [];

  return collectImageCandidates(product).filter(
    (source) => isLikelyImageReference(source) && !isPlaceholderLikeImage(source)
  );
}

function ingredientNames(product: ProductLike): string[] {
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  return ingredients
    .map((ingredient) => {
      if (typeof ingredient === 'string') return ingredient.trim();
      if (ingredient && typeof ingredient === 'object' && 'name' in ingredient) {
        return clean((ingredient as { name?: unknown }).name);
      }
      return '';
    })
    .filter(Boolean);
}

function productTokens(product: ProductLike, ingredients: string[]): string[] {
  const tags = Array.isArray(product.tags) ? product.tags.map(clean).filter(Boolean) : [];
  return [
    clean(product.name),
    clean(product.category),
    ...ingredients,
    ...tags,
  ]
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function pickPalette(tokens: string[]): Palette {
  const joined = ` ${tokens.join(' ')} `;
  return PALETTES.find(({ tokens: paletteTokens }) =>
    paletteTokens.some((token) => joined.includes(` ${token} `))
  )?.palette || DEFAULT_PALETTE;
}

function monogramFor(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TG';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function vesselFor(category: string, name: string): ProductVessel {
  const text = `${category} ${name}`.toLowerCase();
  if (/gel|moss/.test(text) && !/lemonade|drink|refresher/.test(text)) return 'jar';
  if (/shot/.test(text)) return 'shot';
  if (/tea|boba|matcha/.test(text)) return 'cup';
  if (/bundle|box|pack/.test(text)) return 'bundle';
  return 'bottle';
}

export function resolveProductVisual(product: ProductLike): ProductVisualProfile {
  const name = clean(product.name) || 'Taste of Gratitude';
  const category = clean(product.category);
  const ingredients = ingredientNames(product);
  const tokens = productTokens(product, ingredients);
  const palette = pickPalette(tokens);

  const explicitStatus = clean(product.imageStatus).toLowerCase();
  const candidate = getTrustedProductImages(product)[0];

  const photoAllowed = Boolean(candidate) && explicitStatus !== 'missing';
  if (photoAllowed) {
    return {
      mode: 'photo',
      src: candidate || '',
      alt: clean(product.imageAlt) || `${name} from Taste of Gratitude`,
      monogram: monogramFor(name),
      vessel: vesselFor(category, name),
      eyebrow: category || 'Small batch',
      ingredients: ingredients.slice(0, 3),
      ...palette,
      confidence: explicitStatus === 'verified' ? 'verified' : 'derived',
    };
  }

  return {
    mode: 'flavor-art',
    src: '',
    alt: `${name} flavor artwork from Taste of Gratitude`,
    monogram: monogramFor(name),
    vessel: vesselFor(category, name),
    eyebrow: category || 'Small batch',
    ingredients: ingredients.slice(0, 3),
    ...palette,
    confidence: 'derived',
  };
}

export function hasTrustedProductPhoto(product: ProductLike): boolean {
  return resolveProductVisual(product).mode === 'photo';
}
