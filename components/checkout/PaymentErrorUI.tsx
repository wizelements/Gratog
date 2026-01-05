'use client';

/**
 * Payment Error UI Component
 * 
 * Displays clear, actionable error messages when payment form fails.
 * Never shows silent failures - user always sees what went wrong.
 */

import { AlertCircle, RefreshCw, ArrowLeft, MessageCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentError, ERROR_CODES } from './PaymentStateMachine';

interface PaymentErrorUIProps {
  error: PaymentError;
  onRetry: () => void;
  onBack: () => void;
  canRetry: boolean;
  retryCount: number;
}

export function PaymentErrorUI({ error, onRetry, onBack, canRetry, retryCount }: PaymentErrorUIProps) {
  const getErrorDetails = () => {
    switch (error.code) {
      case ERROR_CODES.DOMAIN_NOT_REGISTERED:
        return {
          icon: <AlertCircle className="w-8 h-8 text-orange-500" />,
          title: 'Payment Setup Required',
          description: 'This domain needs to be registered with our payment processor.',
          action: 'Please contact support or try again later.',
          showRetry: false,
        };
      case ERROR_CODES.SDK_LOAD_TIMEOUT:
      case ERROR_CODES.SDK_LOAD_FAILED:
        return {
          icon: <WifiOff className="w-8 h-8 text-red-500" />,
          title: 'Connection Issue',
          description: 'Could not load the secure payment form.',
          action: 'Check your internet connection and try again.',
          showRetry: true,
        };
      case ERROR_CODES.NETWORK_ERROR:
        return {
          icon: <WifiOff className="w-8 h-8 text-red-500" />,
          title: 'Network Error',
          description: 'Unable to connect to payment services.',
          action: 'Please check your internet connection.',
          showRetry: true,
        };
      case ERROR_CODES.CONFIG_ERROR:
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-500" />,
          title: 'Configuration Error',
          description: 'Payment system is not properly configured.',
          action: 'Please contact support.',
          showRetry: false,
        };
      case ERROR_CODES.MOUNT_TIMEOUT:
      case ERROR_CODES.MOUNT_FAILED:
        return {
          icon: <AlertCircle className="w-8 h-8 text-yellow-500" />,
          title: 'Payment Form Error',
          description: 'The payment form could not be displayed.',
          action: 'Try refreshing the page or use a different browser.',
          showRetry: true,
        };
      default:
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-500" />,
          title: 'Payment Error',
          description: error.message || 'Something went wrong with the payment form.',
          action: 'Please try again or contact support.',
          showRetry: canRetry,
        };
    }
  };

  const details = getErrorDetails();

  return (
    <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Error Icon */}
        <div className="p-3 bg-red-50 rounded-full">
          {details.icon}
        </div>

        {/* Error Title */}
        <h3 className="text-lg font-semibold text-gray-900">
          {details.title}
        </h3>

        {/* Error Description */}
        <p className="text-gray-600 text-sm max-w-md">
          {details.description}
        </p>

        {/* Action Hint */}
        <p className="text-gray-500 text-xs">
          {details.action}
        </p>

        {/* Error Code (for debugging) */}
        <p className="text-xs text-gray-400 font-mono">
          Error: {error.code} • Step: {error.step}
          {retryCount > 0 && ` • Attempt ${retryCount + 1}`}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs pt-2">
          {details.showRetry && canRetry && (
            <Button
              onClick={onRetry}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Payment Form
            </Button>
          )}
          
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checkout
          </Button>
        </div>

        {/* Support Link */}
        <a 
          href="/contact" 
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-2"
        >
          <MessageCircle className="w-4 h-4" />
          Contact Support
        </a>
      </div>
    </div>
  );
}

/**
 * Loading state UI with step-specific messaging
 */
interface PaymentLoadingUIProps {
  state: string;
  message: string;
}

export function PaymentLoadingUI({ state, message }: PaymentLoadingUIProps) {
  const getProgress = () => {
    switch (state) {
      case 'loading_sdk': return 25;
      case 'initializing': return 50;
      case 'mounting': return 75;
      case 'ready': return 100;
      default: return 0;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      {/* Spinner */}
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full" />
        <div 
          className="absolute inset-0 w-12 h-12 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin" 
        />
      </div>

      {/* Message */}
      <p className="text-sm text-gray-600 font-medium">{message}</p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-emerald-600 transition-all duration-500 ease-out"
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      {/* Step indicator */}
      <p className="text-xs text-gray-400">
        {state === 'loading_sdk' && 'Step 1 of 3: Loading SDK'}
        {state === 'initializing' && 'Step 2 of 3: Initializing'}
        {state === 'mounting' && 'Step 3 of 3: Preparing form'}
      </p>
    </div>
  );
}
