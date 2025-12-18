'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag, Sparkles, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CartBadge from '@/components/CartBadge';
import WishlistBadge from '@/components/WishlistBadge';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const isActive = (path) => pathname === path;

  return (
    <header id="navigation" className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm" role="banner">
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
        <nav className="hidden lg:flex items-center space-x-6" aria-label="Main navigation">
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
            href="/explore" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              pathname?.startsWith('/explore') ? 'text-[#D4AF37]' : ''
            }`}
          >
            Explore
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              pathname?.startsWith('/explore') ? 'w-full' : ''
            }`} />
          </Link>
          <Link 
            href="/community" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              isActive('/community') ? 'text-[#D4AF37]' : ''
            }`}
          >
            Community
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              isActive('/community') ? 'w-full' : ''
            }`} />
          </Link>
          <Link 
            href="/rewards" 
            className={`text-sm font-medium transition-all hover:text-[#D4AF37] relative group ${
              isActive('/rewards') || isActive('/passport') ? 'text-[#D4AF37]' : ''
            }`}
          >
            Rewards
            <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all group-hover:w-full ${
              isActive('/rewards') || isActive('/passport') ? 'w-full' : ''
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
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          <WishlistBadge />
          <CartBadge />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
          >
            <Link href="/ugc/spicy-bloom">Challenge 🌶️</Link>
          </Button>
          {isAuthenticated ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            >
              <Link href="/profile">
                <User className="h-4 w-4 mr-1" />
                Profile
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            >
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-1" />
                Login
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-white"
          >
            <Link href="/order">Order Now</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-[#D4AF37]/10"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t bg-background/98 backdrop-blur animate-slide-up">
          <nav className="container flex flex-col space-y-1 py-4" aria-label="Mobile navigation">
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
              href="/explore"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                pathname?.startsWith('/explore') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Explore 🌿
            </Link>
            <Link
              href="/rewards"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                isActive('/rewards') || isActive('/passport') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Rewards
            </Link>
            <Link
              href="/ugc/spicy-bloom"
              className={`text-sm font-medium py-3 px-4 rounded-md transition-all hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] ${
                isActive('/ugc/spicy-bloom') ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Challenge 🌶️
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
            
            {/* User Section */}
            <div className="border-t pt-3 mt-3">
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="flex items-center py-3 px-4 rounded-md transition-all hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center py-3 px-4 rounded-md transition-all hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login / Sign Up
                </Link>
              )}
            </div>
            
            <div className="border-t pt-3 mt-3">
              <Link
                href="/order"
                className="flex items-center justify-center bg-[#D4AF37] hover:bg-[#B8941F] text-white font-medium py-3 px-4 rounded-md transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                Order Now
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
