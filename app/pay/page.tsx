/**
 * 🚀 Gratog Pay Flow — Main Page (Live Products)
 * Fetches from existing Gratog storefront API
 * 
 * DISABLED SSR: This page uses Zustand persist middleware which causes
 * hydration mismatches. We disable SSR and let client-side render fully.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { PayFlowHeader } from '@/components/pay-flow/PayFlowHeader';
import { CategoryTabs } from '@/components/pay-flow/CategoryTabs';
import { ProductFeed } from '@/components/pay-flow/ProductFeed';
import { FloatingCartButton } from '@/components/pay-flow/FloatingCartButton';
import { CartPanel } from '@/components/pay-flow/CartPanel';
import { PaymentPanel } from '@/components/pay-flow/PaymentPanel';
import { SuccessScreen } from '@/components/pay-flow/SuccessScreen';
import { MobileSwitchBanner } from '@/components/pay-flow/MobileSwitchBanner';
import { usePayFlowInventory, usePayFlowUI, usePayFlowMetrics } from '@/lib/pay-flow/store';
import { fetchLiveProducts, fetchAdminProducts, getDemoPayFlowProducts } from '@/lib/pay-flow/products-live';
import { ProductGridSkeleton } from '@/components/pay-flow/ProductCardSkeleton';
import { usePayFlowCart } from '@/lib/pay-flow/store';
import { toast } from 'sonner';

export default function PayFlowPage() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Show loading spinner until client-side hydration is ready
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  return <PayFlowContent />;
}

function PayFlowContent() {
  const { setProducts, products, isLoading, setIsLoading } = usePayFlowInventory();
  const { setView } = usePayFlowUI();
  const { startSession } = usePayFlowMetrics();
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  // CRITICAL FIX: Check cart expiry on mount with try-catch
  useEffect(() => {
    try {
      const cart = usePayFlowCart.getState();
      if (cart.isCartExpired()) {
        cart.clearCart();
        toast.info('Your cart expired after 30 minutes of inactivity', {
          description: 'Please add your items again',
        });
      }
    } catch (err) {
      console.error('Cart init error:', err);
      setInitError('Cart initialization failed');
    }
  }, []);
  
  // Fetch live products on mount
  useEffect(() => {
    // Abort any previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    
    const controller = new AbortController();
    abortRef.current = controller;
    
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try storefront API first
        console.log('[PayFlow] Fetching live products...');
        const liveProducts = await fetchLiveProducts(controller.signal);
        
        if (controller.signal.aborted) return;
        
        console.log('[PayFlow] Got', liveProducts.length, 'products');
        setProducts(liveProducts);
        startSession();
      } catch (err) {
        if (controller.signal.aborted) return;
        
        console.warn('Storefront API failed, trying admin API:', err);
        
        try {
          // Fallback to admin API
          const adminProducts = await fetchAdminProducts(controller.signal);
          
          if (controller.signal.aborted) return;
          
          setProducts(adminProducts);
          startSession();
        } catch (adminErr) {
          if (controller.signal.aborted) return;
          
          console.error('All APIs failed:', adminErr);
          setError('Could not load products. Using demo data.');
          
          // Final fallback to demo
          setProducts(getDemoPayFlowProducts());
          startSession();
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    loadProducts();
    
    return () => {
      controller.abort();
    };
  }, [setProducts, setIsLoading, startSession]);
  
  // Calculate category counts from live products
  const categoryCounts = products.reduce((acc, product) => {
    if (product.available) {
      acc[product.category] = (acc[product.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  // Handle search open
  const handleSearchOpen = () => {
    setView('browse');
    const searchInput = document.querySelector('input[placeholder="Search drinks..."]') as HTMLInputElement;
    searchInput?.focus();
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <MobileSwitchBanner />
      <PayFlowHeader onSearchOpen={handleSearchOpen} />
      
      <main className="pb-24">
        {isLoading && (
          <div className="p-3">
            <ProductGridSkeleton count={6} />
          </div>
        )}
        
        {error && !isLoading && (
          <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-sm">{error}</p>
          </div>
        )}
        
        {initError && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{initError}</p>
          </div>
        )}
        
        {!isLoading && !initError && products.length > 0 && (
          <>
            <CategoryTabs counts={categoryCounts} />
            <ProductFeed />
          </>
        )}
        
        {!isLoading && !initError && products.length === 0 && (
          <div className="mx-4 mt-8 p-6 bg-gray-100 border border-gray-200 rounded-xl text-center">
            <p className="text-gray-600 font-medium mb-2">No products available</p>
            <p className="text-gray-500 text-sm">Please check back later or refresh the page.</p>
          </div>
        )}
      </main>
      
      <FloatingCartButton />
      <CartPanel />
      <PaymentPanel />
      <SuccessScreen />
    </div>
  );
}
