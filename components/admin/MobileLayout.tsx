'use client';

import React, { ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  actions?: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

export function MobileLayout({ children, title, showBackButton, actions }: MobileLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
                aria-label="Go back"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
            ) : (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
              {title || 'Admin'}
            </h1>
          </div>
          
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-xl transform transition-transform">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">G</span>
                  </div>
                  <span className="font-semibold text-gray-900">Gratog Admin</span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-colors
                        min-h-[44px]
                        ${isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`w-6 h-6 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Menu Footer */}
              <div className="p-4 border-t border-gray-200 space-y-2">
                <Link
                  href="/admin/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 min-h-[44px]"
                >
                  <Settings className="w-6 h-6 text-gray-400" />
                  Settings
                </Link>
                <button
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 w-full min-h-[44px]"
                >
                  <LogOut className="w-6 h-6" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="p-4 pb-24">
        {children}
      </main>

      {/* Bottom Action Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 pb-safe-area-bottom md:hidden z-40">
        <div className="flex justify-around items-center">
          {navigation.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] min-h-[44px]
                  ${isActive ? 'text-emerald-600' : 'text-gray-400'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MobileLayout;
