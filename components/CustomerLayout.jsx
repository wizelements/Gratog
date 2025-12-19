'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Import static components directly
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';

// Dynamically import ALL components that might have SSR issues
const Header = dynamic(() => import('@/components/Header'), { ssr: false });
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false });
const GoogleAnalytics = dynamic(() => import('@/components/analytics/GoogleAnalytics'), { ssr: false });
const SkipLinks = dynamic(() => import('@/components/SkipLinks'), { ssr: false });
const A11yAnnouncerProvider = dynamic(
  () => import('@/components/ui/a11y-announcer').then(mod => mod.A11yAnnouncerProvider),
  { ssr: false }
);
const Breadcrumbs = dynamic(() => import('@/components/Breadcrumbs'), { ssr: false });
const FloatingCart = dynamic(() => import('@/components/FloatingCart'), { ssr: false });
const LiveChatWidget = dynamic(() => import('@/components/LiveChatWidget'), { ssr: false });
const CartNotification = dynamic(() => import('@/components/cart/CartNotification'), { ssr: false });
const StickySecondaryNav = dynamic(() => import('@/components/StickySecondaryNav'), { ssr: false });

/**
 * Customer Layout - Wraps customer-facing pages with full storefront UI
 * Renders nothing for admin routes (admin routes have their own layout)
 */
export default function CustomerLayout({ children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    setMounted(true);
  }, []);

  // For admin routes, just render children without customer UI
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // SSR: render minimal shell
  if (!mounted) {
    return (
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <main id="main-content" className="flex-1">{children}</main>
        </div>
        <Toaster />
      </AuthProvider>
    );
  }

  return (
    <>
      <GoogleAnalytics />
      <SkipLinks />
      <AuthProvider>
        <A11yAnnouncerProvider>
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
            <Breadcrumbs />
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
            <StickySecondaryNav />
            <FloatingCart />
            <LiveChatWidget />
            <CartNotification />
          </div>
          <Toaster />
        </A11yAnnouncerProvider>
      </AuthProvider>
      
      {/* Service Worker Registration for PWA */}
      <ServiceWorkerRegistration />
    </>
  );
}

function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ PWA: Service Worker registered');
          setInterval(() => { registration.update(); }, 3600000);
        })
        .catch((error) => {
          console.error('❌ PWA: Service Worker registration failed:', error);
        });
    }
  }, []);
  
  return null;
}
