import QuizClient from './QuizClient';

export const metadata = {
  title: 'Product Quiz | Taste of Gratitude',
  description: 'Answer four quick questions to find sea moss gels, drinks, refreshers, shots, and curated sets that match your flavor and format preferences.',
  alternates: { canonical: '/quiz' },
  openGraph: {
    title: 'Taste of Gratitude Product Quiz',
    description: 'Find a starting product, backup product, and curated set based on your flavor and format preferences.',
    url: 'https://tasteofgratitude.shop/quiz',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630 }],
  },
};

export default function QuizPage() {
  return <QuizClient />;
}
