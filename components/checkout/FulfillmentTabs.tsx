
'use client';

/**
 * FulfillmentTabs - Adaptive fulfillment type selector
 * Lets customers choose pickup, eligible local delivery, or nationwide shipping.
 */

import { motion } from 'framer-motion';
import { MapPin, Truck, Package } from 'lucide-react';
import { FulfillmentType } from '@/stores/checkout';

interface FulfillmentTabsProps {
  selected: FulfillmentType;
  onChange: (type: FulfillmentType) => void;
  hasPreorderItems?: boolean;
}

const TABS = [
  { value: 'pickup' as FulfillmentType, label: 'Pickup', icon: MapPin, description: 'Market pickup' },
  { value: 'delivery' as FulfillmentType, label: 'Delivery', icon: Truck, description: 'Atlanta-area only', disabledForPreorder: true },
  { value: 'shipping' as FulfillmentType, label: 'Shipping', icon: Package, description: 'Eligible items only', disabledForPreorder: true },
];

export default function FulfillmentTabs({ selected, onChange, hasPreorderItems = false }: FulfillmentTabsProps) {
  return (
    <div className="space-y-3">
      {/* Preorder explanation banner */}
      {hasPreorderItems && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 animate-in fade-in">
          <div>
            <p className="text-sm font-medium text-amber-900">
              Preorder items are made for market pickup.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Choose a pickup location and date below. Delivery and shipping are unavailable for preorder products.
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1 bg-stone-100 rounded-xl">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selected === tab.value;
        // CRITICAL FIX: Disable non-pickup tabs when preorder items present
        const isDisabled = hasPreorderItems && tab.disabledForPreorder;
        
        return (
          <button
            type="button"
            key={tab.value}
            onClick={() => !isDisabled && onChange(tab.value)}
            disabled={isDisabled}
            className={`relative min-h-24 py-4 px-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="fulfillment-tab"
                className="absolute inset-0 bg-white shadow-md rounded-lg"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            
            <div className="relative z-10 flex flex-col items-center gap-2">
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isSelected ? 'text-emerald-600' : isDisabled ? 'text-gray-400' : 'text-gray-500'
                }`}
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isSelected ? 'text-gray-900' : isDisabled ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </span>
              <span
                className={`text-xs transition-colors ${
                  isSelected ? 'text-gray-600' : isDisabled ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {tab.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>

    {hasPreorderItems && selected !== 'pickup' && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-xs text-red-700 font-medium">
          Your cart has preorder items — these must be collected at a market. Please select &quot;Pickup&quot; to continue.
        </p>
      </div>
    )}
    </div>
  );
}
