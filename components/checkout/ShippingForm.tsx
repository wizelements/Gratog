'use client';

import { motion } from 'framer-motion';
import { Package, Truck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShippingData } from '@/stores/checkout';
import { Fulfillment } from '@/adapters/fulfillmentAdapter';

interface ShippingFormProps {
  data: ShippingData;
  onChange: (data: Partial<ShippingData>) => void;
  errors?: Record<string, string>;
}

export default function ShippingForm({ data, onChange, errors = {} }: ShippingFormProps) {
  const shippingMethods = Fulfillment.shippingMethods();
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipping Address</h3>
        <p className="text-sm text-gray-600">We ship nationwide via USPS and FedEx</p>
      </div>
      
      {/* Address Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="ship-street">Street Address *</Label>
          <Input
            id="ship-street"
            value={data.address.street}
            onChange={(e) => onChange({ address: { ...data.address, street: e.target.value } })}
            placeholder="123 Main Street"
            className={`mt-1 ${errors['address.street'] ? 'border-red-500' : ''}`}
          />
        </div>
        
        <div>
          <Label htmlFor="ship-suite">Apt / Suite (Optional)</Label>
          <Input
            id="ship-suite"
            value={data.address.suite || ''}
            onChange={(e) => onChange({ address: { ...data.address, suite: e.target.value } })}
            placeholder="Apt 4B"
            className="mt-1"
          />
        </div>
        
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <Label htmlFor="ship-city">City *</Label>
            <Input
              id="ship-city"
              value={data.address.city}
              onChange={(e) => onChange({ address: { ...data.address, city: e.target.value } })}
              className="mt-1"
            />
          </div>
          <div className="col-span-1">
            <Label htmlFor="ship-state">State *</Label>
            <Input
              id="ship-state"
              value={data.address.state}
              onChange={(e) => onChange({ address: { ...data.address, state: e.target.value.toUpperCase() } })}
              maxLength={2}
              className="mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="ship-zip">ZIP *</Label>
            <Input
              id="ship-zip"
              value={data.address.zip}
              onChange={(e) => onChange({ address: { ...data.address, zip: e.target.value.replace(/\D/g, '').slice(0, 5) } })}
              maxLength={5}
              className="mt-1"
            />
          </div>
        </div>
      </div>
      
      {/* Shipping Method Selection */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Shipping Method *
        </Label>
        <RadioGroup
          value={data.methodId}
          onValueChange={(value) => onChange({ methodId: value })}
          className="space-y-3"
        >
          {shippingMethods.map((method) => (
            <Label
              key={method.id}
              htmlFor={method.id}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                data.methodId === method.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <RadioGroupItem value={method.id} id={method.id} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{method.name}</span>
                  <span className="font-semibold text-emerald-600">${method.price.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                <p className="text-xs text-gray-500 mt-1">⏱️ {method.estimatedDays}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>
    </motion.div>
  );
}
