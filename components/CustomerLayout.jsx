'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Import static components directly
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

// Dynamically import ALL components that might have SSR issues
const Header = dynamic(() => import('@/components/Header').catch(() => () => null), { 
  ssr: false,
  loading: () => <div className="h-28 bg-white border-b" />
});
const Footer = dynamic(() => import('@/components/Footer').catch(() => () => null), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100" />
});
const EcosystemFooter = dynamic(() => import('@/components/EcosystemFooter').catch(() => () => null), { 
  ssr: false,
  loading: () => <div className="h-32 bg-gray-50" />
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
          <div className="h-28 bg-white border-b" />
          <main id="main-content" className="flex-1">{children}</main>
          <div className="h-64 bg-gray-100" />
        </div>
      </AuthProvider>
    );
  }

  return (
    <>
      <ErrorBoundary>
        <GoogleAnalytics />
      </ErrorBoundary>
      
      <ErrorBoundary>
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
            
            <ErrorBoundary>
              <Breadcrumbs />
            </ErrorBoundary>
            
            <main id="main-content" className="flex-1">
              {children}
            </main>
            
            <ErrorBoundary fallback={<div className="h-64 bg-gray-100" />}>
              <Footer />
            </ErrorBoundary>
            
            <ErrorBoundary fallback={<div className="h-32 bg-gray-50" />}>
              <EcosystemFooter currentProduct="gratog" />
            </ErrorBoundary>
            
            <ErrorBoundary>
              <StickySecondaryNav />
            </ErrorBoundary>
            
            <ErrorBoundary>
              <FloatingCart />
            </ErrorBoundary>
            
            <ErrorBoundary>
              <LiveChatWidget />
            </ErrorBoundary>
            
            <ErrorBoundary>
              <CartNotification />
            </ErrorBoundary>
          </div>
        </A11yAnnouncerProvider>
      </AuthProvider>
      
    </>
  );
}
