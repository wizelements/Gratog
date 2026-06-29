export const metadata = {
  title: 'FAQ | Taste of Gratitude',
  description: 'Answers about Taste of Gratitude weekly menus, sea moss gels, market pickup, small-batch preorder timing, shipping, and community programs.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Taste of Gratitude FAQ',
    description: 'Learn how weekly menus, preorder pickup, sea moss products, and support work.',
    url: 'https://tasteofgratitude.shop/faq',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630 }],
  },
};

export default function FAQLayout({ children }) {
  return children;
}
