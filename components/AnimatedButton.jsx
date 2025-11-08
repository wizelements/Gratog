'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';

/**
 * Enhanced button with loading and success states
 * Supports async actions with visual feedback
 */
export default function AnimatedButton({ 
  children, 
  onClick, 
  className = '',
  variant = 'default',
  size = 'default',
  icon: Icon,
  successMessage = 'Done!',
  ...props 
}) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  const handleClick = async (e) => {
    if (status === 'loading' || !onClick) return;

    try {
      setStatus('loading');
      await onClick(e);
      setStatus('success');
      
      // Reset to idle after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const getContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        );
      case 'success':
        return (
          <>
            <Check className="mr-2 h-4 w-4 animate-scale-in" />
            {successMessage}
          </>
        );
      case 'error':
        return (
          <>
            <span className="mr-2">❌</span>
            Error
          </>
        );
      default:
        return (
          <>
            {Icon && <Icon className="mr-2 h-4 w-4" />}
            {children}
          </>
        );
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={status === 'loading'}
      className={`
        relative overflow-hidden
        transition-all duration-300 ease-out
        ${status === 'loading' ? 'scale-95' : 'hover:scale-105'}
        ${status === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}
        ${status === 'error' ? 'bg-red-600 hover:bg-red-600' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Ripple effect on click */}
      <span className="absolute inset-0 overflow-hidden rounded-md">
        {status === 'idle' && (
          <span className="absolute inset-0 bg-white/20 transform scale-0 group-active:scale-100 transition-transform duration-300 rounded-full" />
        )}
      </span>
      
      <span className="relative flex items-center">
        {getContent()}
      </span>
    </Button>
  );
}
