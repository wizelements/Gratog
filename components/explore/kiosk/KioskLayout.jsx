'use client';

import { useKiosk } from './KioskProvider';
import { cn } from '@/lib/utils';

export default function KioskLayout({ children, className }) {
  const { isKioskMode } = useKiosk();

  return (
    <div
      className={cn(
        'min-h-screen',
        isKioskMode && [
          // Kiosk-specific styles
          'select-none',
          // Large touch targets
          '[&_button]:min-h-[64px]',
          '[&_button]:px-8',
          '[&_button]:text-lg',
          // High contrast
          '[&_button]:font-semibold',
          '[&_button]:shadow-lg',
          // Clear visual feedback
          '[&_button:active]:scale-95',
          '[&_button:active]:shadow-inner'
        ],
        className
      )}
    >
      {children}
    </div>
  );
}
