import { Inter } from 'next/font/google';
import './globals.css';
import CustomerLayout from '@/components/CustomerLayout';
import AdminLayoutWrapper from '@/components/AdminLayoutWrapper';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { MusicControls } from '@/components/MusicControls';
import { CookieConsent } from '@/components/CookieConsent';
import MusicProviderWrapper from '@/components/MusicProviderWrapper';
import { PWAInitializer } from '@/components/PWAInitializer';
import { PWAPrompt } from '@/components/PWAPrompt';
import { PWAUpdateNotifier } from '@/components/PWAUpdateNotifier';
import { PWADiagnostics } from '@/components/PWADiagnostics';

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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    minimumScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover'
  },
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
         {/* PWA & App Manifest */}
         <link rel="manifest" href="/manifest.json" />
         <meta name="theme-color" content="#1f2937" />
         
         {/* iOS App Configuration */}
         <meta name="mobile-web-app-capable" content="yes" />
         <meta name="apple-mobile-web-app-capable" content="yes" />
         <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
         <meta name="apple-mobile-web-app-title" content="Gratog" />
         <meta name="apple-itunes-app" content="app-id=12345678" />
         
         {/* iOS Splash Screens & Icons */}
         <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
         <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="152x152" />
         <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="120x120" />
         
         {/* Prevent toolbar from covering content on iOS */}
         <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=yes, maximum-scale=5" />
         <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
         
         {/* Search Engine Optimization */}
         <link rel="canonical" href="https://tasteofgratitude.shop" />
         
         {/* Icons for different platforms */}
         <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
         <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="32x32" />
         <link rel="shortcut icon" href="/favicon.ico" />
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
        <PWAInitializer />
        <MusicProviderWrapper>
          <AdminLayoutWrapper>
            <CustomerLayout>{children}</CustomerLayout>
          </AdminLayoutWrapper>
          <BackgroundMusic />
          <Suspense fallback={<div className="fixed bottom-6 left-6 z-[9999] w-12 h-12 rounded-full bg-gray-800/90 shadow-lg flex items-center justify-center text-white backdrop-blur-sm">🎵</div>}>
            <MusicControls />
          </Suspense>
        </MusicProviderWrapper>
        <PWAPrompt />
        <PWAUpdateNotifier />
        <PWADiagnostics />
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
