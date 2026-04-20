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
import ExitIntentModal from '@/components/ExitIntentModal';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata = {
  metadataBase: new URL('https://tasteofgratitude.shop'),
  title: 'Taste of Gratitude | Premium Wildcrafted Sea Moss Gel',
  description: 'Hand-crafted sea moss gel with 92 essential minerals. Wildcrafted Irish sea moss products for natural wellness. 100% natural, non-GMO, vegan superfood.',
  keywords: 'sea moss gel, wildcrafted sea moss, Irish sea moss, sea moss products, natural supplements, vegan superfood, holistic wellness',
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
    title: 'Taste of Gratitude | Premium Wildcrafted Sea Moss',
    description: 'Hand-crafted wildcrafted sea moss gel packed with essential minerals for natural wellness.',
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
  viewportFit: 'cover'
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
        <PWAInitializer />
        <MusicProviderWrapper>
          <AdminLayoutWrapper>
            <CustomerLayout>{children}</CustomerLayout>
          </AdminLayoutWrapper>
          <BackgroundMusic />
          <Suspense fallback={<div data-widget="music-controls" className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-[9999] h-12 w-12 rounded-full bg-gray-800/90 shadow-lg flex items-center justify-center text-white backdrop-blur-sm sm:bottom-6 sm:left-6">🎵</div>}>
            <MusicControls />
          </Suspense>
        </MusicProviderWrapper>
        <PWAPrompt />
        <PWAUpdateNotifier />
        <PWADiagnostics />
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
        <ExitIntentModal />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
