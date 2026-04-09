'use client';

import React, { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'bg-white rounded-xl border border-gray-200 overflow-hidden',
  {
    variants: {
      size: {
        default: 'p-4',
        compact: 'p-3',
        large: 'p-6',
      },
      interactive: {
        true: 'active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md',
        false: '',
      },
    },
    defaultVariants: {
      size: 'default',
      interactive: false,
    },
  }
);

interface MobileCardProps extends VariantProps<typeof cardVariants> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  footer?: ReactNode;
  badge?: {
    text: string;
    color: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
  };
}

const badgeColors = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-800',
};

export function MobileCard({ 
  children, 
  className = '', 
  size, 
  interactive, 
  onClick,
  title,
  subtitle,
  icon,
  footer,
  badge
}: MobileCardProps) {
  return (
    <div
      className={`${cardVariants({ size, interactive })} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header */}
      {(title || icon) && (
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="font-semibold text-gray-900 text-base leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          
          {badge && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeColors[badge.color]}`}>
              {badge.text}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className={title || icon ? 'mt-3' : ''}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  );
}

interface MobileCardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  gap?: 'small' | 'medium' | 'large';
  className?: string;
}

export function MobileCardGrid({ 
  children, 
  columns = 2, 
  gap = 'medium',
  className = '' 
}: MobileCardGridProps) {
  const gapClasses = {
    small: 'gap-3',
    medium: 'gap-4',
    large: 'gap-6',
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    positive: boolean;
  };
  icon?: React.ReactNode;
  color?: 'green' | 'blue' | 'purple' | 'orange';
}

export function StatCard({ label, value, change, icon, color = 'green' }: StatCardProps) {
  const colorClasses = {
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-sm font-medium ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
                {change.positive ? '+' : ''}{change.value}%
              </span>
              <span className="text-xs text-gray-400"> vs last week</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default { MobileCard, MobileCardGrid, StatCard };
