'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { triggerHaptic, HapticPatterns } from '@/lib/haptics';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/catalog', label: 'Shop', icon: ShoppingBag },
  { href: '/checkout', label: 'Cart', icon: ShoppingCart },
  { href: '/profile/orders', label: 'Orders', icon: ClipboardList },
  { href: '/account', label: 'Account', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  const shouldHide =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/cart') ||
    pathname?.startsWith('/order');

  if (shouldHide) {
    return null;
  }

  const handleNavClick = () => {
    // Haptic feedback on navigation
    triggerHaptic(HapticPatterns.LIGHT);
  };

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white/95 dark:bg-gray-900/95
        backdrop-blur-lg
        border-t border-gray-200 dark:border-gray-800
        md:hidden
        safe-bottom
      `}
      style={{
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`
                flex flex-col items-center justify-center
                min-w-[64px] min-h-[56px]
                px-2 py-2
                rounded-xl
                transition-colors duration-150
                no-select
                ${isActive 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }
                active:scale-95
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon 
                  className="w-6 h-6" 
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className="mt-0.5 text-xs font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
