
'use client';

/**
 * FulfillmentTabs - Adaptive fulfillment type selector
 * Shipping removed — customers are directed to contact us for shipping inquiries.
 */

import { motion } from 'framer-motion';
import { MapPin, Truck, Package, Mail } from 'lucide-react';
import { FulfillmentType } from '@/stores/checkout';

interface FulfillmentTabsProps {
  selected: FulfillmentType;
  onChange: (type: FulfillmentType) => void;
  hasPreorderItems?: boolean;
}

const TABS = [
  { value: 'pickup' as FulfillmentType, label: 'Pickup', icon: MapPin, description: 'Pick up at market' },
  { value: 'delivery' as FulfillmentType, label: 'Delivery', icon: Truck, description: 'Home delivery' },
];

export default function FulfillmentTabs({ selected, onChange, hasPreorderItems = false }: FulfillmentTabsProps) {
  return (
    <>
    <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-xl">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selected === tab.value;
        
        return (
          <button
            type="button"
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className="relative py-4 px-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
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
                  isSelected ? 'text-emerald-600' : 'text-gray-500'
                }`}
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isSelected ? 'text-gray-900' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </span>
              <span
                className={`text-xs transition-colors ${
                  isSelected ? 'text-gray-600' : 'text-gray-500'
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
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
        ⏳ Your cart has preorder items — these are made fresh and can only be collected at a market. Please select &quot;Pickup&quot;.
      </p>
    )}
    </>
  );
}
