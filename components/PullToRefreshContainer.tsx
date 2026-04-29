'use client';

import { ReactNode } from 'react';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';

interface PullToRefreshContainerProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

/**
 * Container component that adds pull-to-refresh functionality
 * Wraps pages that need refresh capability (catalog, orders, etc)
 */
export function PullToRefreshContainer({
  children,
  onRefresh,
  disabled = false,
  className = '',
}: PullToRefreshContainerProps) {
  const { state, handlers, style } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  return (
    <div
      className={`relative ${className}`}
      {...handlers}
      style={style}
    >
      <PullIndicator
        progress={state.pullProgress}
        isRefreshing={state.isRefreshing}
        canRelease={state.canRelease}
      />
      
      <div className="min-h-screen">
        {children}
      </div>
    </div>
  );
}
