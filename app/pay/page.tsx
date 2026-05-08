export const dynamic = 'force-dynamic';

/**
 * 🚀 Gratog Pay Flow — Main Page (Live Products)
 * Fetches from existing Gratog storefront API
 */

'use client';

import { useEffect, useState } from 'react';
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
import type { PayFlowProduct } from '@/lib/pay-flow/types';

export default function PayFlowPage() {
  const { setProducts, products, isLoading, setIsLoading } = usePayFlowInventory();
  const { setView } = usePayFlowUI();
  const { startSession } = usePayFlowMetrics();
  const [error, setError] = useState<string | null>(null);
  
  // Fetch live products on mount
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try storefront API first
        const liveProducts = await fetchLiveProducts();
        setProducts(liveProducts);
        startSession();
      } catch (err) {
        console.warn('Storefront API failed, trying admin API:', err);
        
        try {
          // Fallback to admin API
          const adminProducts = await fetchAdminProducts();
          setProducts(adminProducts);
          startSession();
        } catch (adminErr) {
          console.error('All APIs failed:', adminErr);
          setError('Could not load products. Using demo data.');
          
          // Final fallback to demo
          setProducts(getDemoPayFlowProducts());
          startSession();
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
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
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Loading fresh drinks...🥤</p>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-sm">{error}</p>
          </div>
        )}
        
        {!isLoading && (
          <>
            <CategoryTabs counts={categoryCounts} />
            <ProductFeed />
          </>
        )}
      </main>
      
      <FloatingCartButton />
      <CartPanel />
      <PaymentPanel />
      <SuccessScreen />
    </div>
  );
}
