'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag, Sparkles, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CartBadge from '@/components/CartBadge';
import WishlistBadge from '@/components/WishlistBadge';
import SearchBar from '@/components/SearchBar';
import MegaMenu from '@/components/MegaMenu';
import AccessibilityControls from '@/components/AccessibilityControls';
import HelpCenter from '@/components/HelpCenter';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const isActive = (path) => pathname === path;

  return (
    <header id="navigation" className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm" role="banner">
      {/* Top Row: Logo and Search */}
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
          <div className="relative">
            <ShoppingBag className="h-6 w-6 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <Sparkles className="h-3 w-3 text-[#D4AF37] absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#8B7355] bg-clip-text text-transparent hidden sm:inline">
            Taste of Gratitude
          </span>
        </Link>

        {/* Search Bar - Desktop */}
        <div className="hidden md:block flex-1">
          <SearchBar placeholder="Search products, guides..." />
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AccessibilityControls />
          <HelpCenter />
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

      {/* Desktop Navigation Row */}
      <nav className="hidden md:block border-t bg-gradient-to-r from-white to-gray-50" aria-label="Main navigation">
        <div className="container flex h-12 items-center space-x-8">
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
          {/* Mega Menu for Shop */}
          <MegaMenu trigger="Shop" />
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
          <MegaMenu trigger="Learn" />
          <MegaMenu trigger="Account" />
        </div>

        {/* Right Side Action Buttons */}
        <div className="hidden md:flex items-center space-x-2 ml-auto">
          <WishlistBadge />
          <CartBadge />
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
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t bg-background/98 backdrop-blur animate-slide-up max-h-[70vh] overflow-y-auto">
          <div className="container py-4 space-y-1">
            {/* Search Bar for Mobile */}
            <div className="mb-4 px-2">
              <SearchBar placeholder="Search..." />
            </div>

            {/* Shop Section */}
            <div className="border-b pb-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider px-4 py-2 mb-1">
                Shop
              </p>
              <Link href="/catalog" className="block text-sm py-2 px-4 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded" onClick={() => setIsMenuOpen(false)}>
                All Products
              </Link>
              <Link href="/catalog?category=gel" className="block text-sm py-2 px-4 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded" onClick={() => setIsMenuOpen(false)}>
                Sea Moss Gel
              </Link>
              <Link href="/catalog?type=bundle" className="block text-sm py-2 px-4 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded" onClick={() => setIsMenuOpen(false)}>
                Bundles
              </Link>
            </div>

            {/* Learn Section */}
            <div className="border-b pb-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider px-4 py-2 mb-1">
                Learn
              </p>
              <Link href="/#what-is-sea-moss" className="block text-sm py-2 px-4 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded" onClick={() => setIsMenuOpen(false)}>
                What is Sea Moss?
              </Link>
              <Link href="/explore/learn" className="block text-sm py-2 px-4 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded" onClick={() => setIsMenuOpen(false)}>
                How to Use
              </Link>
              <Link href="/explore/games" className="block text-sm py-2 px-4 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded" onClick={() => setIsMenuOpen(false)}>
                Games
              </Link>
            </div>

            {/* Account Section */}
            <div className="border-b pb-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider px-4 py-2 mb-1">
                Account
              </p>
              {isAuthenticated ? (
                <Link href="/profile" className="block text-sm py-2 px-4 hover:bg-emerald-50 hover:text-emerald-700 rounded font-medium" onClick={() => setIsMenuOpen(false)}>
                  <User className="h-4 w-4 inline mr-2" />
                  My Profile
                </Link>
              ) : (
                <Link href="/login" className="block text-sm py-2 px-4 hover:bg-emerald-50 hover:text-emerald-700 rounded font-medium" onClick={() => setIsMenuOpen(false)}>
                  <LogIn className="h-4 w-4 inline mr-2" />
                  Login / Register
                </Link>
              )}
              <Link href="/rewards" className="block text-sm py-2 px-4 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] rounded" onClick={() => setIsMenuOpen(false)}>
                Rewards Program
              </Link>
            </div>

            {/* Help Section */}
            <div className="pt-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider px-4 py-2 mb-1">
                Help
              </p>
              <Link href="/#faq" className="block text-sm py-2 px-4 hover:bg-blue-50 hover:text-blue-600 rounded" onClick={() => setIsMenuOpen(false)}>
                FAQ
              </Link>
              <Link href="/contact" className="block text-sm py-2 px-4 hover:bg-blue-50 hover:text-blue-600 rounded" onClick={() => setIsMenuOpen(false)}>
                Contact Us
              </Link>
              <Link href="/about" className="block text-sm py-2 px-4 hover:bg-blue-50 hover:text-blue-600 rounded" onClick={() => setIsMenuOpen(false)}>
                About Us
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
