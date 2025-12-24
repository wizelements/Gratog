const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) console.log('[CATALOG-API]', ...args); };

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

/**
 * Custom hook to fetch products from catalog API
 * Provides real-time product data with loading states and error handling
 */
export function useCatalog() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Try the new catalog API first
        let response = await fetch('/api/v1/catalog');
        let data;
        
        if (response.ok) {
          data = await response.json();
          // Check if we actually got products
          if (data.products && data.products.length > 0) {
            setProducts(data.products);
            setError(null);
            return;
          }
        }
        
        // Fallback to admin products API if catalog is empty or failed
        response = await fetch('/api/admin/products');
        if (!response.ok) {
          throw new Error(`Admin products API failed: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
        setProducts(data.products || []);
        setError(null);
        
      } catch (err) {
        logger.error('Catalog', 'Both catalog APIs failed', err);
        setError(err);
        
        // Final fallback to static products
        try {
          const { PRODUCTS } = await import('@/lib/products');
          setProducts(PRODUCTS);
          debug('Using static products fallback');
        } catch (fallbackErr) {
          logger.error('Catalog', 'Static products fallback failed', fallbackErr);
          setProducts([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, isLoading, error };
}

/**
 * Hook to fetch individual product by ID/slug
 */
export function useProduct(productId) {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/v1/products/${productId}`);
        if (!response.ok) {
          throw new Error(`Product API failed: ${response.status}`);
        }
        
        const data = await response.json();
        setProduct(data.product);
        setError(null);
      } catch (err) {
        logger.error('Catalog', 'Product API Error', err);
        setError(err);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, isLoading, error };
}