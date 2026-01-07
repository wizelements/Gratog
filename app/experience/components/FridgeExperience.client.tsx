'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useProducts } from '../hooks/useProducts';
import { useIsMobile } from '../hooks/useIsMobile';
import ProductDetailsPanel from './ProductDetailsPanel';
import dynamic from 'next/dynamic';

const FridgeCanvas = dynamic(() => import('./FridgeCanvas'), { ssr: false });

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

export default function FridgeExperience() {
  const { products, loading } = useProducts(8);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const isMobile = useIsMobile();

  return (
    <section
      id="fridge"
      className="py-24 md:py-32 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
    >
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr,1.1fr] gap-10 items-center">
        <div className="space-y-5">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-emerald-100">
            Interactive Fridge
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-emerald-50">
            Open the Cold Glow of Your Sea Moss Ritual
          </h2>
          <p className="text-emerald-50 text-base md:text-lg leading-relaxed">
            You've drifted through the journey and explored the mineral galaxy. 
            Now step inside the fridge — hover through glowing jars, click to 
            pull one into focus, and add it straight to your cart.
          </p>

          {isMobile && (
            <p className="text-sm text-emerald-50 bg-slate-900/90 border border-emerald-400/60 rounded-lg p-3 leading-relaxed">
              📱 Mobile view: Tap the jar cards below to explore products.
              For the full 3D fridge experience, visit on desktop.
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hover to glow</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-100">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Click to select</span>
            </div>
          </div>
        </div>

        <div className="relative h-[340px] md:h-[420px] lg:h-[480px] rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden shadow-2xl shadow-emerald-900/50">
          {!isMobile && !loading && (
            <FridgeCanvas
              products={products}
              loading={loading}
              onProductSelect={setActiveProduct}
            />
          )}

          {!isMobile && loading && (
            <div 
              className="absolute inset-0 flex items-center justify-center"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                <p className="text-emerald-100 text-[11px] md:text-xs uppercase tracking-[0.18em]">
                  Loading fridge...
                </p>
              </div>
            </div>
          )}

          {isMobile && (
            <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto max-h-full">
              {loading && (
                <div className="col-span-2 flex items-center justify-center py-8">
                  <p className="text-emerald-100 text-sm">Loading products…</p>
                </div>
              )}
              {!loading &&
                products.map((p: Product) => (
                  <button
                    key={p.id || p.slug || p.name}
                    onClick={() => setActiveProduct(p)}
                    className="group flex flex-col items-start rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/50 p-4 text-left shadow-lg shadow-emerald-900/40 hover:-translate-y-1 hover:border-emerald-400/80 hover:shadow-emerald-700/60 transition-transform transition-shadow transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    {p.image && (
                      <div className="w-full aspect-[4/3] rounded-xl bg-slate-800/80 mb-3 overflow-hidden">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <span className="text-[11px] uppercase tracking-[0.15em] text-emerald-200 mb-2">
                      {p.category || 'Sea Moss'}
                    </span>
                    <span className="text-sm font-semibold text-emerald-50 line-clamp-2 mb-2">
                      {p.name}
                    </span>
                    <span className="text-sm text-emerald-100 font-medium">
                      ${typeof p.price === 'number' ? p.price.toFixed(2) : '—'}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeProduct && (
          <ProductDetailsPanel
            product={activeProduct}
            onClose={() => setActiveProduct(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
