'use client';

import { useEffect, useState } from 'react';
import { getDemoProducts } from '@/lib/demo-products';

type Product = {
  id?: string;
  slug?: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
};

export function useProducts(limit?: number) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;

    const fetchProducts = async () => {
      const timeoutId = setTimeout(() => {
        if (aborted) return;
        const demo = getDemoProducts();
        setProducts(limit ? demo.slice(0, limit) : demo);
        setLoading(false);
      }, 10000);

      try {
        const fetchOptions: RequestInit = {};
        if (typeof AbortController !== 'undefined') {
          const controller = new AbortController();
          fetchOptions.signal = controller.signal;
          setTimeout(() => controller.abort(), 8000);
        }

        const res = await fetch('/api/products', fetchOptions);
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Failed to load products');

        const data = await res.json();
        if (!aborted && data.success && data.products) {
          const list = limit ? data.products.slice(0, limit) : data.products;
          setProducts(list);
        }
      } catch {
        if (aborted) return;
        const demo = getDemoProducts();
        setProducts(limit ? demo.slice(0, limit) : demo);
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      aborted = true;
    };
  }, [limit]);

  return { products, loading } as const;
}
