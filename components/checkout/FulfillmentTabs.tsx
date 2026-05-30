
'use client';

/**
 * FulfillmentTabs - Adaptive fulfillment type selector
 * Shipping removed — customers are directed to contact us for shipping inquiries.
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
  { value: 'pickup' as FulfillmentType, label: 'Pickup', icon: MapPin, description: 'Pick up at market' },
  { value: 'delivery' as FulfillmentType, label: 'Delivery', icon: Truck, description: 'Home delivery', disabledForPreorder: true },
];

export default function FulfillmentTabs({ selected, onChange, hasPreorderItems = false }: FulfillmentTabsProps) {
  return (
    <div className="space-y-3">
      {/* Preorder explanation banner */}
      {hasPreorderItems && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 animate-in fade-in">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-600 text-xs">⏳</span>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">
                Preorder items in your cart
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These items must be picked up at a market. Delivery is unavailable for preorder products.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-xl">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selected === tab.value;
        // CRITICAL FIX: Disable delivery tab when preorder items present
        const isDisabled = hasPreorderItems && tab.disabledForPreorder;
        
        return (
          <button
            type="button"
            key={tab.value}
            onClick={() => !isDisabled && onChange(tab.value)}
            disabled={isDisabled}
            className={`relative py-4 px-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
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

    {/* Shipping contact notice */}
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
      <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-blue-800">Need shipping?</p>
        <p className="text-xs text-blue-700 mt-0.5">
          We offer nationwide shipping on select products.{' '}
          <a href="/contact" className="underline font-medium hover:text-blue-900">Contact us</a>{' '}
          or email{' '}
          <a href="mailto:info@tasteofgratitude.shop" className="underline font-medium hover:text-blue-900">
            info@tasteofgratitude.shop
          </a>{' '}
          to arrange shipping.
        </p>
      </div>
    </div>

    {hasPreorderItems && selected !== 'pickup' && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-xs text-red-700 font-medium">
          ⚠️ Your cart has preorder items — these must be collected at a market. Please select &quot;Pickup&quot; to continue.
        </p>
      </div>
    )}
    </div>
  );
}
