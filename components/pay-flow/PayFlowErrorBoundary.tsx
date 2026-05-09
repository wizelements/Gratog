/**
 * 🚀 Gratog Pay Flow — Error Boundary
 * Prevents entire flow crash on component errors
 */

'use client';

import { Component, ReactNode } from 'react';
import { usePayFlowUI, usePayFlowCart } from '@/lib/pay-flow/store';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PayFlowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    console.error('[PayFlow Error]', error, errorInfo);
    
    // Could send to error tracking service here
    // errorTracker.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    // Clear cart and reset flow
    this.setState({ hasError: false, error: undefined });
    
    // Reset stores
    try {
      const { resetFlow } = usePayFlowUI.getState();
      resetFlow();
    } catch {
      // Ignore if store not available
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">😅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-500 mb-6">
              Don&apos;t worry, your cart is safe. Let&apos;s get you back to shopping.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3 bg-amber-400 text-gray-900 rounded-xl font-semibold hover:bg-amber-500 transition-colors"
              >
                Try Again
              </button>
              
              <a
                href="/catalog"
                className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Browse Full Catalog
              </a>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-left overflow-auto">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
