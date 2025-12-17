const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingCart from '@/components/FloatingCart';
import CartNotification from '@/components/cart/CartNotification';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://gratog.vercel.app'),
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
      <head>
        {/* Square Web Payments SDK */}
        <script 
          type="text/javascript" 
          src="https://web.squarecdn.com/v1/square.js"
          async
        />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:rounded">
          Skip to main content
        </a>
        <AuthProvider>
          {/* Dev Build Indicator - Only in Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-2 px-4 text-sm font-medium shadow-md z-50 sticky top-0">
              <div className="container mx-auto flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>Development Build • Trust Enhancements Active</span>
              </div>
            </div>
          )}
          
          <div className="flex min-h-screen flex-col">
            <Header />
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
            <FloatingCart />
            <CartNotification />
          </div>
          <Toaster />
        </AuthProvider>
        
        {/* Service Worker Registration for PWA
            SECURITY NOTE: dangerouslySetInnerHTML is safe here because:
            1. The script content is hardcoded and not derived from user input
            2. This is a legitimate service worker registration for PWA functionality
            3. The __html property contains only controlled, internal code */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    debug('✅ PWA: Service Worker registered');
                    
                    // Check for updates every hour
                    setInterval(() => {
                      registration.update();
                    }, 3600000);
                  })
                  .catch((error) => {
                    console.error('❌ PWA: Service Worker registration failed:', error);
                  });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
