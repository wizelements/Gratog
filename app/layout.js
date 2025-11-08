import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingCart from '@/components/FloatingCart';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://gratog.vercel.app'),
  title: 'Taste of Gratitude | Wildcrafted Sea Moss Gel - 92 Essential Minerals | Premium Irish Sea Moss',
  description: 'Premium wildcrafted sea moss gel packed with 92 essential minerals. Hand-crafted Irish sea moss products for immune support, thyroid health, and wellness. 100% natural, non-GMO, vegan superfood. Free shipping on orders over $50.',
  keywords: 'sea moss gel, wildcrafted sea moss, Irish sea moss, sea moss benefits, sea moss gel organic, sea moss 92 minerals, sea moss immune support, sea moss thyroid health, purple sea moss, gold sea moss, sea moss lemonade, elderberry sea moss, natural supplements, vegan superfood, holistic wellness',
  authors: [{ name: 'Taste of Gratitude' }],
  creator: 'Taste of Gratitude',
  publisher: 'Taste of Gratitude',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Taste of Gratitude | Wildcrafted Sea Moss Gel - 92 Essential Minerals',
    description: 'Premium wildcrafted sea moss gel packed with 92 essential minerals for optimal wellness. Hand-crafted with care from pristine ocean waters.',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://gratog.vercel.app',
    siteName: 'Taste of Gratitude',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Taste of Gratitude - Premium Wildcrafted Sea Moss Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taste of Gratitude | Premium Wildcrafted Sea Moss Gel',
    description: 'Premium wildcrafted sea moss gel with 92 essential minerals. 100% natural superfood for optimal wellness.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://gratog.vercel.app',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingCart />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
