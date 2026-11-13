export const metadata = {
  title: 'Founder Story | Taste of Gratitude',
  description: 'Meet founder Jenneisha Glover and learn how her personal health journey, fresh juices and a Ted’s Gym request led to Taste of Gratitude.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'Founder Story | Taste of Gratitude',
    description: 'Jenneisha’s journey from South Bend to Atlanta, fresh juices, Ted’s Gym, and Taste of Gratitude.',
    url: 'https://tasteofgratitude.shop/about',
    images: [{ url: '/images/gratog-bg.PNG', width: 1200, height: 630 }],
  },
};

export default function AboutLayout({ children }) {
  return children;
}
