'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="relative">
            <ShoppingBag className="h-6 w-6 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <Sparkles className="h-3 w-3 text-[#D4AF37] absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#8B7355] bg-clip-text text-transparent">
            Taste of Gratitude
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            href="/" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              isActive('/') ? 'text-[#D4AF37]' : ''
            }`}
          >
            Home
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              isActive('/') ? 'w-full' : ''
            }`} />
          </Link>
          <Link 
            href="/catalog" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              isActive('/catalog') ? 'text-[#D4AF37]' : ''
            }`}
          >
            Catalog
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              isActive('/catalog') ? 'w-full' : ''
            }`} />
          </Link>
          <Link 
            href="/markets" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              isActive('/markets') ? 'text-[#D4AF37]' : ''
            }`}
          >
            Markets
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              isActive('/markets') ? 'w-full' : ''
            }`} />
          </Link>
          <Link 
            href="/about" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              isActive('/about') ? 'text-[#D4AF37]' : ''
            }`}
          >
            About
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              isActive('/about') ? 'w-full' : ''
            }`} />
          </Link>
          <Link 
            href="/contact" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              isActive('/contact') ? 'text-[#D4AF37]' : ''
            }`}
          >
            Contact
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              isActive('/contact') ? 'w-full' : ''
            }`} />
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-[#D4AF37]/10"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background/98 backdrop-blur animate-slide-up">
          <nav className="container flex flex-col space-y-1 py-4">
            <Link
              href="/"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                isActive('/') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/catalog"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                isActive('/catalog') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Catalog
            </Link>
            <Link
              href="/markets"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                isActive('/markets') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Markets
            </Link>
            <Link
              href="/about"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                isActive('/about') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                isActive('/contact') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
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
