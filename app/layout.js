import { Inter } from 'next/font/google';
import './globals.css';
import './styles/mobile-touch.css';
import './styles/desktop-responsive.css';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { LiveLocationBanner } from '@/components/market/LiveLocationBanner';
import { CookieConsent } from '@/components/CookieConsent';
import { PWAInitializer } from '@/components/PWAInitializer';
import { PWAPrompt } from '@/components/PWAPrompt';
import { PWAUpdateNotifier } from '@/components/PWAUpdateNotifier';
import { PWADiagnostics } from '@/components/PWADiagnostics';
import { BottomNav } from '@/components/BottomNav';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import { AuthProvider } from '@/contexts/AuthContext';
import { AnalyticsProvider } from '@/components/analytics/WebVitals';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata = {
  metadataBase: new URL('https://tasteofgratitude.shop'),
  title: 'Taste of Gratitude | Small-Batch Sea Moss & Market Wellness',
  description: 'Founder-led Atlanta wellness commerce for small-batch sea moss gels, fresh drinks, wellness shots, weekly market menus, pickup, delivery, and eligible shipping.',
  keywords: 'Taste of Gratitude, Atlanta sea moss, small batch sea moss gel, farmers market wellness, market pickup, wellness shots, fresh drinks',
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
    title: 'Taste of Gratitude | Small-Batch Sea Moss & Market Wellness',
    description: 'A founder-led Atlanta market wellness brand with weekly menus, small-batch products, and clear online ordering.',
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
    description: 'Hand-crafted wildcrafted sea moss gel with essential minerals. 100% natural superfood for wellness.',
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
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#1f2937'
};

// Next.js 15: Layouts are static by default, cache with semi-dynamic for auth state
// Removed force-dynamic — child pages control their own rendering strategy

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
         
         {/* iOS Splash Screens - All Device Sizes */}
         {/* iPhone 14 Pro Max (1290×2796) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_14_Pro_Max.png" />
         {/* iPhone 14 Pro (1179×2556) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_14_Pro.png" />
         {/* iPhone 14 Plus (1284×2778) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_14_Plus.png" />
         {/* iPhone 14 / 13 / 12 (1170×2532) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_14.png" />
         {/* iPhone 13 / 12 mini (1080×2340) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_13_mini.png" />
         {/* iPhone SE / 8 / 7 / 6s / 6 (750×1334) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iPhone_SE.png" />
         {/* iPhone 8 Plus / 7 Plus / 6s Plus / 6 Plus (1242×2208) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iPhone_8_Plus.png" />
         {/* iPad Pro 12.9" (2048×2732) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iPad_Pro_12.9.png" />
         {/* iPad Pro 11" / Air (1668×2388) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iPad_Pro_11.png" />
         {/* iPad Air / mini (1640×2360) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iPad_Air.png" />
         {/* iPad mini (1488×2266) */}
         <link rel="apple-touch-startup-image" media="screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iPad_mini.png" />
         
         {/* iOS Icons */}
         <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
         <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="152x152" />
         <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="120x120" />
         
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

         {/* Inline SW auto-reload: runs independent of bundled JS so even stale PWA picks it up */}
         <script dangerouslySetInnerHTML={{ __html: `
           if('serviceWorker' in navigator){
             var _swReloaded=false;
             navigator.serviceWorker.addEventListener('controllerchange',function(){
               if(!_swReloaded&&typeof window!=='undefined'){_swReloaded=true;window.location.reload();}
             });
             navigator.serviceWorker.addEventListener('message',function(e){
               if(e.data&&e.data.type==='SW_ACTIVATED'&&!_swReloaded&&typeof window!=='undefined'){
                 _swReloaded=true;window.location.reload();
               }
             });
           }
         `}} />
       </head>
      <body className={inter.className}>
        <AuthProvider>
          <AnalyticsProvider>
          <PWAInitializer />
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <LiveLocationBanner />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>}>
            <div className="min-h-screen">
              {children}
            </div>
          </Suspense>
          <Footer />
          <PWAPrompt />
          <PWAUpdateNotifier />
          <PWADiagnostics />
          <Suspense fallback={null}>
            <CookieConsent />
          </Suspense>
          <BottomNav />
          <Toaster position="top-right" richColors />
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
