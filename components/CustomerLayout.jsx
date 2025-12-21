'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Import static components directly
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Dynamically import ALL components that might have SSR issues
const Header = dynamic(() => import('@/components/Header').catch(() => () => null), { 
  ssr: false,
  loading: () => <div className="h-28 bg-white border-b" />
});
const Footer = dynamic(() => import('@/components/Footer').catch(() => () => null), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100" />
});
const GoogleAnalytics = dynamic(
  () => import('@/components/analytics/GoogleAnalytics').catch(() => () => null), 
  { ssr: false }
);
const SkipLinks = dynamic(
  () => import('@/components/SkipLinks').catch(() => () => null), 
  { ssr: false }
);
const A11yAnnouncerProvider = dynamic(
  () => import('@/components/ui/a11y-announcer')
    .then(mod => mod.A11yAnnouncerProvider)
    .catch(() => ({ children }) => children),
  { ssr: false }
);
const Breadcrumbs = dynamic(
  () => import('@/components/Breadcrumbs').catch(() => () => null), 
  { ssr: false }
);
const FloatingCart = dynamic(
  () => import('@/components/FloatingCart').catch(() => () => null), 
  { ssr: false }
);
const LiveChatWidget = dynamic(
  () => import('@/components/LiveChatWidget').catch(() => () => null), 
  { ssr: false }
);
const CartNotification = dynamic(
  () => import('@/components/cart/CartNotification').catch(() => () => null), 
  { ssr: false }
);
const StickySecondaryNav = dynamic(
  () => import('@/components/StickySecondaryNav').catch(() => () => null), 
  { ssr: false }
);

/**
 * Customer Layout - Wraps customer-facing pages with full storefront UI
 * Renders nothing for admin routes (admin routes have their own layout)
 * 
 * Each component is wrapped in an ErrorBoundary so if one fails,
 * the rest of the page still works (graceful degradation)
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

  // SSR: render minimal shell that matches client structure
  if (!mounted) {
    return (
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <div className="h-28 bg-white border-b" /> {/* Header placeholder */}
          <main id="main-content" className="flex-1">{children}</main>
          <div className="h-64 bg-gray-100" /> {/* Footer placeholder */}
        </div>
        <Toaster />
      </AuthProvider>
    );
  }

  return (
    <>
      <ErrorBoundary silent>
        <GoogleAnalytics />
      </ErrorBoundary>
      
      <ErrorBoundary silent>
        <SkipLinks />
      </ErrorBoundary>
      
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
            <ErrorBoundary fallback={<div className="h-28 bg-white border-b" />}>
              <Header />
            </ErrorBoundary>
            
            <ErrorBoundary silent>
              <Breadcrumbs />
            </ErrorBoundary>
            
            <main id="main-content" className="flex-1">
              <ErrorBoundary 
                fallback={
                  <div className="container py-20 text-center">
                    <p className="text-gray-600">We're experiencing a temporary issue. Please refresh the page.</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Refresh Page
                    </button>
                  </div>
                }
              >
                {children}
              </ErrorBoundary>
            </main>
            
            <ErrorBoundary fallback={<div className="h-64 bg-gray-100" />}>
              <Footer />
            </ErrorBoundary>
            
            <ErrorBoundary silent>
              <StickySecondaryNav />
            </ErrorBoundary>
            
            <ErrorBoundary silent>
              <FloatingCart />
            </ErrorBoundary>
            
            <ErrorBoundary silent>
              <LiveChatWidget />
            </ErrorBoundary>
            
            <ErrorBoundary silent>
              <CartNotification />
            </ErrorBoundary>
          </div>
          <Toaster />
        </A11yAnnouncerProvider>
      </AuthProvider>
      
      {/* Service Worker Registration for PWA */}
      <ErrorBoundary silent>
        <ServiceWorkerRegistration />
      </ErrorBoundary>
    </>
  );
}

function ServiceWorkerRegistration() {
  useEffect(() => {
    try {
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
    } catch (e) {
      // Silently fail - SW is not critical
    }
  }, []);
  
  return null;
}
