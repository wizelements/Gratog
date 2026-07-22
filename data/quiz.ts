import {
  getActiveProducts,
  getProductBySlugOrId,
  getRecommendedProductsForFlavor,
  type MarketProduct,
} from './products';
import { BUNDLES, type ProductBundle } from './bundles';

export interface QuizAnswers {
  support: string;
  productType: string;
  frequency: string;
  avoid: string;
}

export interface QuizRecommendation {
  primary: MarketProduct;
  backup: MarketProduct;
  bundle: ProductBundle;
  reason: string;
}

const TYPE_TO_PRODUCT: Record<string, string> = {
  drink: 'kissed-by-gods',
  gel: 'grateful-greens-gel',
  shot: 'grateful-defense',
  refresher: 'cucumber-mint-ginger',
  'not sure': 'strawberry-bliss',
};

const SUPPORT_TO_BUNDLE: Record<string, string> = {
  'berry-forward': 'starter-box',
  'tropical': 'weekly-wellness-box',
  'green-fresh': 'starter-box',
  'light-hydrating': 'hydration-refresh-box',
  'warm-spiced': 'mineral-reset',
  'first-timer-variety': 'weekly-wellness-box',
};

export const QUIZ_QUESTIONS = [
  {
    id: 'support',
    question: 'Which flavor or experience direction sounds best?',
    options: ['berry-forward', 'tropical', 'green-fresh', 'light-hydrating', 'warm-spiced', 'first-timer variety'],
  },
  {
    id: 'productType',
    question: 'What product type do you prefer?',
    options: ['drink', 'gel', 'shot', 'refresher', 'not sure'],
  },
  {
    id: 'frequency',
    question: 'How do you plan to use it?',
    options: ['daily', 'a few times weekly', 'market pickup only', 'trying for first time'],
  },
  {
    id: 'avoid',
    question: 'Any ingredients to avoid?',
    options: ['none', 'ginger', 'honey', 'bee pollen', 'spicy heat'],
  },
];

function productContainsAvoidance(product: MarketProduct, avoid: string) {
  if (!avoid || avoid === 'none') return false;
  const normalizedAvoid = avoid.toLowerCase();
  return product.ingredients.some((ingredient) => ingredient.toLowerCase().includes(normalizedAvoid.replace('spicy heat', 'jalapeño')));
}

function firstSafeProduct(candidates: MarketProduct[], avoid: string, fallbackId: string): MarketProduct {
  const fallbackCandidates = [
    getProductBySlugOrId(fallbackId),
    ...getActiveProducts(),
  ].filter(Boolean) as MarketProduct[];

  return (candidates.find((product) => !productContainsAvoidance(product, avoid)) ||
    fallbackCandidates.find((product) => !productContainsAvoidance(product, avoid)) ||
    getProductBySlugOrId('strawberry-bliss') ||
    getProductBySlugOrId('kissed-by-gods')) as MarketProduct;
}

export function getQuizRecommendation(answers: QuizAnswers): QuizRecommendation {
  const goalCandidates = getRecommendedProductsForFlavor(answers.support);
  const typeCandidate = getProductBySlugOrId(TYPE_TO_PRODUCT[answers.productType] || 'strawberry-bliss');
  const primaryPool = [typeCandidate, ...goalCandidates].filter(Boolean) as MarketProduct[];

  const primary = firstSafeProduct(primaryPool, answers.avoid, 'strawberry-bliss');
  const backup = firstSafeProduct(goalCandidates.filter((product) => product.id !== primary.id), answers.avoid, 'supplemint');
  const bundle = BUNDLES.find((item) => item.id === SUPPORT_TO_BUNDLE[answers.support]) || BUNDLES[0];

  const cadence = answers.frequency === 'daily'
    ? 'Because you want a simple daily routine, start with a product that is easy to repeat.'
    : answers.frequency === 'trying for first time'
      ? 'Because you are trying Taste of Gratitude for the first time, this keeps the flavor approachable and the routine easy.'
      : 'Because you want a flexible routine, this gives you a clear starting point without overcommitting.';

  return {
    primary,
    backup,
    bundle,
    reason: `${cadence} We matched your ${answers.productType || 'not sure'} preference with a flavor profile you'll like.`,
  };
}
