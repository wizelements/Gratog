'use client';

import { ReactNode } from 'react';
import { useSwipeToDismiss } from '@/hooks/useSwipe';
import { X } from 'lucide-react';

interface SwipeableModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  showHandle?: boolean;
}

/**
 * Modal that can be dismissed by swiping down (mobile-native feel)
 */
export function SwipeableModal({
  children,
  isOpen,
  onClose,
  title,
  showHandle = true,
}: SwipeableModalProps) {
  const { handlers, style } = useSwipeToDismiss({
    onDismiss: onClose,
    direction: 'down',
    threshold: 100,
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
      
      {/* Modal */}
      <div
        className="relative w-full sm:w-auto sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        {...handlers}
        style={style}
      >
        {/* Swipe handle */}
        {showHandle && (
          <div className="flex items-center justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {(title || showHandle) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
            {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
