<<<<<<< HEAD
=======
// @ts-nocheck
>>>>>>> upstream/main
'use client';

/**
 * DeliveryForm - Address, delivery window, and tip selection for delivery orders
 */

import { motion } from 'framer-motion';
import { MapPin, Clock, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DeliveryData } from '@/stores/checkout';
import { Fulfillment } from '@/adapters/fulfillmentAdapter';
import { Button } from '@/components/ui/button';

interface DeliveryFormProps {
  data: DeliveryData;
  onChange: (data: Partial<DeliveryData>) => void;
  tip: number;
  onTipChange: (tip: number) => void;
  errors?: Record<string, string>;
}

const TIP_PRESETS = [0, 2, 4, 6, 8];

export default function DeliveryForm({ data, onChange, tip, onTipChange, errors = {} }: DeliveryFormProps) {
  const [zipValid, setZipValid] = useState<boolean | null>(null);
  const [customTip, setCustomTip] = useState<string>('');
  
  const handleZipChange = (zip: string) => {
    onChange({ address: { ...data.address, zip } });
    
    if (zip.length === 5) {
      const valid = Fulfillment.isZipServiceable(zip);
      setZipValid(valid);
    } else {
      setZipValid(null);
    }
  };
  
  const deliveryWindows = data.address.zip && zipValid 
    ? Fulfillment.deliveryWindowsForZip(data.address.zip)
    : [];
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Details</h3>
        <p className="text-sm text-gray-600">
          We deliver to Atlanta and South Fulton areas
        </p>
      </div>
      
      {/* Street Address */}
      <div>
        <Label htmlFor="street" className="text-sm font-medium text-gray-700">
          Street Address *
        </Label>
        <Input
          id="street"
          type="text"
          value={data.address.street}
          onChange={(e) => onChange({ address: { ...data.address, street: e.target.value } })}
          placeholder="123 Main Street"
          className={`mt-1 ${errors['address.street'] ? 'border-red-500' : ''}`}
          autoComplete="street-address"
        />
        {errors['address.street'] && (
          <p className="mt-1 text-xs text-red-500">{errors['address.street']}</p>
        )}
      </div>
      
      {/* Apt/Suite */}
      <div>
        <Label htmlFor="suite" className="text-sm font-medium text-gray-700">
          Apt / Suite <span className="text-gray-500">(Optional)</span>
        </Label>
        <Input
          id="suite"
          type="text"
          value={data.address.suite || ''}
          onChange={(e) => onChange({ address: { ...data.address, suite: e.target.value } })}
          placeholder="Apt 4B"
          className="mt-1"
        />
      </div>
      
      {/* City, State, ZIP */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <Label htmlFor="city" className="text-sm font-medium text-gray-700">
            City *
          </Label>
          <Input
            id="city"
            type="text"
            value={data.address.city}
            onChange={(e) => onChange({ address: { ...data.address, city: e.target.value } })}
            placeholder="Atlanta"
            className={`mt-1 ${errors['address.city'] ? 'border-red-500' : ''}`}
            autoComplete="address-level2"
          />
        </div>
        
        <div className="col-span-1">
          <Label htmlFor="state" className="text-sm font-medium text-gray-700">
            State *
          </Label>
          <Input
            id="state"
            type="text"
            value={data.address.state}
            onChange={(e) => onChange({ address: { ...data.address, state: e.target.value.toUpperCase() } })}
            placeholder="GA"
            maxLength={2}
            className={`mt-1 ${errors['address.state'] ? 'border-red-500' : ''}`}
            autoComplete="address-level1"
          />
        </div>
        
        <div className="col-span-2">
          <Label htmlFor="zip" className="text-sm font-medium text-gray-700">
            ZIP Code *
          </Label>
          <div className="relative">
            <Input
              id="zip"
              type="text"
              value={data.address.zip}
              onChange={(e) => handleZipChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="30310"
              maxLength={5}
              className={`mt-1 pr-10 ${errors['address.zip'] || zipValid === false ? 'border-red-500' : zipValid ? 'border-emerald-500' : ''}`}
              autoComplete="postal-code"
            />
            {zipValid !== null && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                {zipValid ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ZIP Validation Message */}
      {zipValid === false && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              We don't deliver to this area yet
            </p>
            <p className="text-xs text-red-600 mt-1">
              Try Pickup or Shipping, or check if you entered the correct ZIP code.
            </p>
          </div>
        </motion.div>
      )}
      
      {zipValid && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4"
        >
          {/* Delivery Window */}
          <div>
            <Label htmlFor="window" className="text-sm font-medium text-gray-700">
              Delivery Window *
            </Label>
            <Select
              value={data.window}
              onValueChange={(value) => onChange({ window: value })}
            >
              <SelectTrigger
                id="window"
                className={`mt-1 ${errors.window ? 'border-red-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <SelectValue placeholder="Choose delivery time" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {deliveryWindows.map((window) => (
                  <SelectItem key={window.value} value={window.value} disabled={!window.available}>
                    {window.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tip Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Add a tip for your driver 💚
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {TIP_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={tip === preset ? 'default' : 'outline'}
                  className={`col-span-1 ${
                    tip === preset
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'hover:border-emerald-500'
                  }`}
                  onClick={() => {
                    onTipChange(preset);
                    setCustomTip('');
                  }}
                >
                  ${preset}
                </Button>
              ))}
              <div className="col-span-1 relative">
                <Input
                  type="number"
                  value={customTip}
                  onChange={(e) => {
                    setCustomTip(e.target.value);
                    const value = parseFloat(e.target.value) || 0;
                    onTipChange(value);
                  }}
                  placeholder="Other"
                  min="0"
                  step="0.5"
                  className="h-10 text-center"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              100% of tips go directly to your delivery driver
            </p>
          </div>
          
          {/* Delivery Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Delivery Instructions <span className="text-gray-500">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={data.notes || ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="e.g., 'Leave at door', 'Ring bell', 'Gate code: 1234'"
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
