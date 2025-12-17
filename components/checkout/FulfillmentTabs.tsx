
'use client';

/**
 * FulfillmentTabs - Adaptive fulfillment type selector
 */

import { motion } from 'framer-motion';
import { MapPin, Truck, Package } from 'lucide-react';
import { FulfillmentType } from '@/stores/checkout';

interface FulfillmentTabsProps {
  selected: FulfillmentType;
  onChange: (type: FulfillmentType) => void;
}

const TABS = [
  { value: 'pickup' as FulfillmentType, label: 'Pickup', icon: MapPin, description: 'Pick up at market' },
  { value: 'delivery' as FulfillmentType, label: 'Delivery', icon: Truck, description: 'Home delivery' },
  { value: 'shipping' as FulfillmentType, label: 'Shipping', icon: Package, description: 'Ship to address' }
];

export default function FulfillmentTabs({ selected, onChange }: FulfillmentTabsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 p-1 bg-gray-100 rounded-xl">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selected === tab.value;
        
        return (
          <button
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
  );
}
