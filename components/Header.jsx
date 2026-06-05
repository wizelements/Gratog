'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CartBadge from '@/components/CartBadge';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isActive = (path) => pathname === path || pathname?.startsWith(`${path}/`);
  const isMobileActive = (path) => pathname === path || pathname?.startsWith(`${path}/`);
  const desktopNavItems = [
    { href: '/menu', label: 'Menu' },
    { href: '/markets', label: 'Markets' },
    { href: '/catalog', label: 'Shop' },
    { href: '/about', label: 'About' },
  ];
  const mobileNavItems = [
    { href: '/catalog', label: 'Shop' },
    { href: '/menu', label: 'Menu' },
    { href: '/markets', label: 'Markets' },
    { href: '/about', label: 'Our Story' },
    {
      href: isAuthenticated ? '/profile' : '/login',
      label: isAuthenticated ? 'Account' : 'Login',
    },
  ];

  return (
    <header id="navigation" className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm" role="banner">
      {/* Primary navigation */}
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
          <div className="relative">
            <ShoppingBag className="h-6 w-6 text-[#D4AF37] transition-transform group-hover:scale-105" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#8B7355] bg-clip-text text-transparent hidden sm:inline">
            Taste of Gratitude
          </span>
        </Link>

        <nav className="hidden md:flex flex-1 items-center justify-center gap-8" aria-label="Main navigation">
          {desktopNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-[#D4AF37] ${
                isActive(item.href) ? 'text-[#D4AF37]' : 'text-gray-800'
              }`}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Controls */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
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
        <div id="mobile-menu" className="md:hidden border-t bg-background/98 backdrop-blur animate-slide-up max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="container py-4">
            <nav className="space-y-1" aria-label="Mobile navigation">
              {mobileNavItems.map((item) => {
                const active = isMobileActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-12 items-center rounded-lg px-4 text-base font-medium transition-colors ${
                      active
                        ? 'bg-[#D4AF37]/15 text-[#8B7355]'
                        : 'text-gray-800 hover:bg-gray-50 hover:text-[#8B7355]'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
