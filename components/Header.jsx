'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <ShoppingBag className="h-6 w-6 text-[#D4AF37]" />
          <span className="text-xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#8B7355] bg-clip-text text-transparent">
            Taste of Gratitude
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-[#D4AF37]">
            Home
          </Link>
          <Link href="/catalog" className="text-sm font-medium transition-colors hover:text-[#D4AF37]">
            Catalog
          </Link>
          <Link href="/markets" className="text-sm font-medium transition-colors hover:text-[#D4AF37]">
            Markets
          </Link>
          <Link href="/about" className="text-sm font-medium transition-colors hover:text-[#D4AF37]">
            About
          </Link>
          <Link href="/contact" className="text-sm font-medium transition-colors hover:text-[#D4AF37]">
            Contact
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container flex flex-col space-y-4 py-4">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-[#D4AF37]"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/catalog"
              className="text-sm font-medium transition-colors hover:text-[#D4AF37]"
              onClick={() => setIsMenuOpen(false)}
            >
              Catalog
            </Link>
            <Link
              href="/markets"
              className="text-sm font-medium transition-colors hover:text-[#D4AF37]"
              onClick={() => setIsMenuOpen(false)}
            >
              Markets
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-[#D4AF37]"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium transition-colors hover:text-[#D4AF37]"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
