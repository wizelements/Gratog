/**
 * 🚀 Gratog Pay Flow — Header
 * Brand bar with staff mode toggle
 */

'use client';

import { useState, useEffect } from 'react';
// @ts-expect-error lucide-react types issue
import { Search, X, UserCog } from 'lucide-react';
import { usePayFlowUI } from '@/lib/pay-flow/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PayFlowHeaderProps {
  onSearchOpen?: () => void;
}

// SECURITY: Staff PIN should be in environment variable
// For production, use proper authentication instead of a simple PIN
const STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || '2024';

// Staff mode auto-timeout after 5 minutes
const STAFF_TIMEOUT_MS = 5 * 60 * 1000;

export function PayFlowHeader({ onSearchOpen }: PayFlowHeaderProps) {
  const { isStaffMode, toggleStaffMode, disableStaffMode, searchQuery, setSearchQuery, clearSearch } = usePayFlowUI();
  const [showStaffPin, setShowStaffPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // SECURITY: Auto-disable staff mode after timeout
  useEffect(() => {
    if (!isStaffMode) return;
    
    const timeout = setTimeout(() => {
      disableStaffMode();
      toast.info('Staff mode timed out after 5 minutes');
    }, STAFF_TIMEOUT_MS);
    
    return () => clearTimeout(timeout);
  }, [isStaffMode, disableStaffMode]);
  
  const handleStaffToggle = () => {
    if (isStaffMode) {
      toggleStaffMode();
      setShowStaffPin(false);
      setPin('');
      setPinError(false);
    } else {
      setShowStaffPin(true);
      setPinError(false);
    }
  };
  
  const handlePinSubmit = () => {
    if (pin === STAFF_PIN) {
      toggleStaffMode();
      setShowStaffPin(false);
      setPin('');
      setPinError(false);
      toast.success('Staff mode enabled');
    } else {
      setPinError(true);
      setPin('');
      toast.error('Invalid PIN');
    }
  };
  
  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center">
              <span className="text-xl">🥤</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Gratog</h1>
              <p className="text-xs text-gray-500">Market Checkout</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={onSearchOpen}
              className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Staff Mode Toggle */}
            <button
              onClick={handleStaffToggle}
              className={cn(
                "p-2.5 rounded-full transition-colors",
                isStaffMode 
                  ? "bg-amber-100 text-amber-700" 
                  : "hover:bg-gray-100 text-gray-600"
              )}
              aria-label="Staff mode"
              title={isStaffMode ? "Exit staff mode" : "Enter staff mode"}
            >
              <UserCog className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search Bar (inline) */}
        {searchQuery && (
          <div className="px-4 pb-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drinks..."
                className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </header>
      
      {/* Staff PIN Modal */}
      {showStaffPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Staff Access</h3>
            <p className="text-sm text-gray-500 mb-4">Enter PIN to manage inventory</p>
            
            {pinError && (
              <p className="text-sm text-red-500 mb-2">Incorrect PIN. Please try again.</p>
            )}
            
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(false);
              }}
              placeholder="••••"
              className={cn(
                "w-full px-4 py-3 border-2 rounded-xl text-center text-2xl tracking-widest font-mono focus:outline-none mb-4",
                pinError 
                  ? "border-red-300 focus:border-red-400" 
                  : "border-gray-200 focus:border-amber-400"
              )}
              maxLength={4}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowStaffPin(false);
                  setPin('');
                  setPinError(false);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium"
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
