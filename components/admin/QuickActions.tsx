'use client';

import React, { ReactNode } from 'react';
import { 
  Plus, 
  Package, 
  ShoppingCart, 
  Truck,
  RotateCcw,
  Users,
  Tag
} from 'lucide-react';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  badge?: number;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  variant?: 'grid' | 'fab' | 'list';
}

const colorClasses = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const defaultActions: QuickAction[] = [
  {
    icon: <Plus className="w-5 h-5" />,
    label: 'New Order',
    onClick: () => window.location.href = '/admin/orders/new',
    color: 'primary',
  },
  {
    icon: <Package className="w-5 h-5" />,
    label: 'Add Product',
    onClick: () => window.location.href = '/admin/products/new',
    color: 'success',
  },
  {
    icon: <Truck className="w-5 h-5" />,
    label: 'Ship Orders',
    onClick: () => window.location.href = '/admin/orders?filter=unshipped',
    color: 'warning',
  },
  {
    icon: <RotateCcw className="w-5 h-5" />,
    label: 'Returns',
    onClick: () => window.location.href = '/admin/returns',
    color: 'danger',
    badge: 0,
  },
];

export function QuickActions({ actions = defaultActions, variant = 'grid' }: QuickActionsProps) {
  if (variant === 'fab') {
    return (
      <button
        onClick={() => {
          // Open quick action menu
          const event = new CustomEvent('openQuickActions');
          window.dispatchEvent(event);
        }}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all md:hidden"
        aria-label="Quick actions"
      >
        <Plus className="w-6 h-6" />
      </button>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.99] transition-all min-h-[44px]"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[action.color || 'primary']}`}>
              {action.icon}
            </div>
            <span className="font-medium text-gray-900">{action.label}</span>
            {action.badge ? (
              <span className="ml-auto bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                {action.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white border border-gray-200 hover:shadow-md active:scale-[0.98] transition-all min-h-[88px]"
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClasses[action.color || 'primary']}`}>
            {action.icon}
          </div>
          <span className="text-sm font-medium text-gray-700">{action.label}</span>
          {action.badge ? (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {action.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

interface QuickActionBarProps {
  visible?: boolean;
}

export function QuickActionBar({ visible = true }: QuickActionBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-200 p-2 pb-safe-area-bottom shadow-lg transform transition-transform duration-300 md:hidden">
      <div className="flex justify-around items-center">
        <button 
          onClick={() => window.location.href = '/admin'}
          className="flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[44px] text-gray-600"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-xs mt-1">Orders</span>
        </button>
        
        <button 
          onClick={() => window.location.href = '/admin/inventory'}
          className="flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[44px] text-gray-600"
        >
          <Package className="w-5 h-5" />
          <span className="text-xs mt-1">Inventory</span>
        </button>
        
        <button 
          onClick={() => {
            const event = new CustomEvent('openQuickActions');
            window.dispatchEvent(event);
          }}
          className="flex flex-col items-center justify-center w-14 h-14 -mt-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
        
        <button 
          onClick={() => window.location.href = '/admin/customers'}
          className="flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[44px] text-gray-600"
        >
          <Users className="w-5 h-5" />
          <span className="text-xs mt-1">Customers</span>
        </button>
        
        <button 
          onClick={() => window.location.href = '/admin/coupons'}
          className="flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[44px] text-gray-600"
        >
          <Tag className="w-5 h-5" />
          <span className="text-xs mt-1">Coupons</span>
        </button>
      </div>
    </div>
  );
}

export default { QuickActions, QuickActionBar };
