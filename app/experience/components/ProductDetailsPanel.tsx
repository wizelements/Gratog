'use client';

import { motion } from 'framer-motion';
import { X, ArrowRight, Star, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCartEngine } from '@/hooks/useCartEngine';
import { toast } from 'sonner';

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

type Props = {
  product: Product;
  onClose: () => void;
};

export default function ProductDetailsPanel({ product, onClose }: Props) {
  const slug = product.slug || product.id;
  const { addItem } = useCartEngine();

  const handleAddToCart = () => {
    addItem({
      id: product.id || product.slug || 'unknown',
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image || '/placeholder.jpg',
    });
    toast.success(`${product.name} added to cart!`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm px-3 md:px-0"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative w-full max-w-xl rounded-t-3xl md:rounded-3xl bg-slate-950 border border-emerald-500/40 shadow-2xl shadow-emerald-600/40 p-6 md:p-8"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-emerald-200/80 hover:text-emerald-50 p-2"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 mb-2">
          From the Fridge
        </p>
        <h3 className="text-2xl md:text-3xl font-semibold text-emerald-50 mb-3 pr-8">
          {product.name}
        </h3>

        <div className="flex items-center gap-3 text-sm text-emerald-200 mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <span>Customer Favorite</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
          <span>{product.category || 'Sea Moss Gel'}</span>
        </div>

        <p className="text-emerald-50 text-base md:text-lg mb-6 leading-relaxed">
          {product.description ||
            'Wildcrafted sea moss gel crafted in small batches with gratitude, ready for your daily ritual. Each jar contains 92 essential minerals your body craves.'}
        </p>

        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="text-2xl md:text-3xl font-bold text-emerald-300">
            ${typeof product.price === 'number' ? product.price.toFixed(2) : '—'}
          </span>
          <Button
            onClick={handleAddToCart}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-3 shadow-lg shadow-emerald-500/30"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>

        <Link
          href={`/product/${slug}`}
          className="inline-flex items-center text-sm text-emerald-50 hover:text-emerald-200 transition-colors"
        >
          View full product details
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </motion.div>
    </motion.div>
  );
}
