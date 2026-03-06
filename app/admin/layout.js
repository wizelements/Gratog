'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { logger } from '@/lib/logger';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Warehouse,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Clock,
  Mail,
  Ticket,
  ExternalLink,
  MapPin,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Markets', href: '/admin/markets', icon: MapPin },
  { name: 'Inventory', href: '/admin/inventory', icon: Warehouse },
  { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { name: 'Campaigns', href: '/admin/campaigns', icon: Mail },
  { name: 'Interactions', href: '/admin/interactions', icon: Video },
  { name: 'Waitlist', href: '/admin/waitlist', icon: Clock },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname !== '/admin/login') {
      adminFetch('/api/admin/auth/me')
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data?.user) {
            setUser(data.user);
          }
        })
        .catch((error) => logger.error('Admin', 'Failed to fetch user', error));
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully');
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  // Login page - minimal layout without customer elements
  if (pathname === '/admin/login') {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
                Taste of Gratitude
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Admin Dashboard</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Divider */}
              <div className="my-4 border-t border-slate-200 dark:border-slate-700" />
              
              {/* View Store Link */}
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ExternalLink className="h-5 w-5" />
                <span>View Store</span>
              </Link>
            </nav>

            {/* User info */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              {user && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                    {user.role}
                  </span>
                </div>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start gap-2 border-slate-200 dark:border-slate-600"
                size="sm"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Header */}
          <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X /> : <Menu />}
              </Button>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h2>
              <div className="w-10" />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </>
  );
}
