'use client'

import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/store/cart'

export default function CartBadge() {
  const { totalItems } = useCart()
  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setCount(totalItems())
    }
  }, [mounted, totalItems])

  if (!mounted) {
    // Return placeholder to avoid hydration mismatch
    return (
      <Link href="/order" aria-label="Cart" className="relative">
        <ShoppingCart className="w-6 h-6 text-[#D4AF37]" />
      </Link>
    )
  }

  return (
    <Link 
      href="/order" 
      aria-label={`Cart with ${count} items`}
      className="relative hover:opacity-80 transition-opacity"
    >
      <ShoppingCart className="w-6 h-6 text-[#D4AF37]" />
      {count > 0 && (
        <span
          aria-live="polite"
          aria-atomic="true"
          className="absolute -top-2 -right-2 bg-red-600 text-white text-xs
                     px-1.5 py-0.5 rounded-full font-semibold shadow-sm min-w-[20px]
                     text-center animate-in fade-in zoom-in duration-200"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
