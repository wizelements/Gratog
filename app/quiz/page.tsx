import QuizClient from './QuizClient';

export const metadata = {
  title: 'Wellness Quiz | Taste of Gratitude',
  description: 'Take the Taste of Gratitude quiz to find sea moss gels, drinks, refreshers, shots, and bundles for your weekly routine.',
  alternates: { canonical: '/quiz' },
  openGraph: {
    title: 'Taste of Gratitude Wellness Quiz',
    description: 'Find your starting product, backup product, and weekly bundle suggestion.',
    url: 'https://tasteofgratitude.shop/quiz',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630 }],
  },
};

export default function QuizPage() {
  return <QuizClient />;
}
