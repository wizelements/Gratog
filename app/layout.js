import { Inter } from 'next/font/google';
import './globals.css';
import CustomerLayout from '@/components/CustomerLayout';
import AdminLayoutWrapper from '@/components/AdminLayoutWrapper';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { MusicControls } from '@/components/MusicControls';
import MusicProviderWrapper from '@/components/MusicProviderWrapper';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata = {
  metadataBase: new URL('https://tasteofgratitude.shop'),
  title: 'Taste of Gratitude | Wildcrafted Sea Moss Gel - 92 Essential Minerals | Premium Irish Sea Moss',
  description: 'Premium wildcrafted sea moss gel packed with 92 essential minerals. Hand-crafted Irish sea moss products for immune support, thyroid health, and wellness. 100% natural, non-GMO, vegan superfood. Free shipping on orders over $50.',
  keywords: 'sea moss gel, wildcrafted sea moss, Irish sea moss, sea moss benefits, sea moss gel organic, sea moss 92 minerals, sea moss immune support, sea moss thyroid health, purple sea moss, gold sea moss, sea moss lemonade, elderberry sea moss, natural supplements, vegan superfood, holistic wellness',
  authors: [{ name: 'Taste of Gratitude' }],
  creator: 'Taste of Gratitude',
  publisher: 'Taste of Gratitude',
  manifest: '/manifest.json',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Taste of Gratitude | Wildcrafted Sea Moss Gel - 92 Essential Minerals',
    description: 'Premium wildcrafted sea moss gel packed with 92 essential minerals for optimal wellness. Hand-crafted with care from pristine ocean waters.',
    url: 'https://tasteofgratitude.shop',
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
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
         {/* Preconnect hints for external resources - improves LCP */}
         <link rel="preconnect" href="https://web.squarecdn.com" crossOrigin="anonymous" />
         <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
         <link rel="preconnect" href="https://items-images-production.s3.us-west-2.amazonaws.com" crossOrigin="anonymous" />
         <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
         <link rel="dns-prefetch" href="https://web.squarecdn.com" />
         <link rel="dns-prefetch" href="https://images.unsplash.com" />
         <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
         
         {/* Square Web Payments SDK - loaded with high priority */}
         <link rel="preload" as="script" href="https://web.squarecdn.com/v1/square.js" />
         <script 
           type="text/javascript" 
           src="https://web.squarecdn.com/v1/square.js"
           async
         />
       </head>
      <body className={inter.className}>
        <MusicProviderWrapper>
          <AdminLayoutWrapper>
            <CustomerLayout>{children}</CustomerLayout>
          </AdminLayoutWrapper>
          <BackgroundMusic />
          <Suspense fallback={<div className="fixed bottom-6 left-6 z-[9999] w-12 h-12 rounded-full bg-gray-800/90 shadow-lg flex items-center justify-center text-white backdrop-blur-sm">🎵</div>}>
            <MusicControls />
          </Suspense>
          <Toaster position="top-right" richColors />
        </MusicProviderWrapper>
      </body>
    </html>
  );
}
