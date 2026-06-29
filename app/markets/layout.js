export const metadata = {
  title: 'Atlanta Market Pickup | Taste of Gratitude',
  description: 'Find Taste of Gratitude at Atlanta-area farmers markets, view pickup windows, preorder cutoffs, and market pickup guidance.',
  alternates: { canonical: '/markets' },
  openGraph: {
    title: 'Atlanta Market Pickup | Taste of Gratitude',
    description: 'Weekly market pickup details for small-batch sea moss gels, drinks, refreshers, and shots.',
    url: 'https://tasteofgratitude.shop/markets',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630 }],
  },
};

export default function MarketsLayout({ children }) {
  return children;
}
