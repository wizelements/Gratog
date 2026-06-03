'use client';

/**
 * DeliveryForm - Address, delivery window, and tip selection for delivery orders
 * 🎯 UX IMPROVEMENTS: ZIP validation on blur only, not during typing
 */

import { motion } from 'framer-motion';
import { Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
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
  subtotal: number;
  tip: number;
  onTipChange: (tip: number) => void;
  errors?: Record<string, string>;
}

const TIP_PRESETS = [0, 2, 4, 6, 8];

export default function DeliveryForm({ data, onChange, subtotal, tip, onTipChange, errors = {} }: DeliveryFormProps) {
  // 🎯 ZIP VALIDATION: Only validate after user finishes typing (on blur)
  const [zipTouched, setZipTouched] = useState(false);
  const [zipValid, setZipValid] = useState<boolean | null>(null);
  const [customTip, setCustomTip] = useState<string>(() => {
    // Initialize from tip prop if it's not a preset
    return TIP_PRESETS.includes(tip) || tip === 0 ? '' : String(tip);
  });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  
  const clearQuoteFields = {
    fee: undefined,
    distanceMiles: undefined,
    deliveryMessage: undefined,
    quotedSubtotal: undefined,
  };
  
  const updateAddress = (addressUpdate: Partial<DeliveryData['address']>) => {
    setQuoteError(null);
    onChange({
      address: { ...data.address, ...addressUpdate },
      ...clearQuoteFields,
    });
  };
  
  // Validate ZIP on blur - not during typing
  const validateZip = useCallback((zip: string) => {
    if (zip.length === 5) {
      const isValid = Fulfillment.isZipServiceable(zip);
      setZipValid(isValid);
      return isValid;
    } else {
      setZipValid(null);
      return null;
    }
  }, []);
  
  const handleZipChange = (zip: string) => {
    // Strip non-digits, limit to 5
    const cleaned = zip.replace(/\D/g, '').slice(0, 5);
    updateAddress({ zip: cleaned });
    
    // Reset validation state while typing
    if (zipTouched && cleaned.length < 5) {
      setZipValid(null);
    }
  };
  
  const handleZipBlur = () => {
    setZipTouched(true);
    validateZip(data.address.zip);
  };

  const quoteDelivery = async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    setZipTouched(true);

    const currentZipValid = validateZip(data.address.zip);
    if (currentZipValid !== true) {
      setQuoteLoading(false);
      setQuoteError('Enter a serviceable 5-digit ZIP before checking delivery.');
      onChange(clearQuoteFields);
      return;
    }

    try {
      const res = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: data.address,
          subtotal,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setQuoteError(json.error || 'Unable to quote delivery for this address.');
        onChange(clearQuoteFields);
        return;
      }

      onChange({
        fee: json.deliveryFee,
        distanceMiles: json.distanceMiles,
        deliveryMessage: json.message,
        quotedSubtotal: subtotal,
      });
    } catch {
      setQuoteError('Unable to quote delivery right now. Please try again.');
      onChange(clearQuoteFields);
    } finally {
      setQuoteLoading(false);
    }
  };
  
  // Delivery windows only show when ZIP is valid
  const deliveryWindows = zipValid === true && data.address.zip.length === 5
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
          onChange={(e) => updateAddress({ street: e.target.value })}
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
          onChange={(e) => updateAddress({ suite: e.target.value })}
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
            onChange={(e) => updateAddress({ city: e.target.value })}
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
            onChange={(e) => updateAddress({ state: e.target.value.toUpperCase() })}
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
              onChange={(e) => handleZipChange(e.target.value)}
              onBlur={handleZipBlur}
              placeholder="30310"
              maxLength={5}
              inputMode="numeric"
              className={`mt-1 pr-10 ${
                zipTouched && zipValid === false ? 'border-red-500' : 
                zipTouched && zipValid === true ? 'border-emerald-500' : 
                ''
              }`}
              autoComplete="postal-code"
            />
            {zipTouched && zipValid !== null && (
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
      
      {/* ZIP Validation Message - Only after blur */}
      {zipTouched && zipValid === false && data.address.zip.length === 5 && (
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
      
      {/* ZIP Help - Show while typing if incomplete */}
      {data.address.zip.length > 0 && data.address.zip.length < 5 && (
        <p className="text-xs text-gray-500">
          Enter complete 5-digit ZIP code
        </p>
      )}

      {/* Delivery Quote */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={quoteDelivery}
          disabled={
            quoteLoading ||
            !data.address.street ||
            !data.address.city ||
            data.address.zip.length !== 5 ||
            (zipTouched && zipValid === false)
          }
          className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          {quoteLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking delivery fee...
            </>
          ) : (
            'Check delivery fee by mileage'
          )}
        </Button>

        {data.deliveryMessage && data.quotedSubtotal === subtotal && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {data.deliveryMessage}
          </p>
        )}

        {data.quotedSubtotal !== undefined && data.quotedSubtotal !== subtotal && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Your cart changed. Check delivery fee again before continuing.
          </p>
        )}

        {(quoteError || errors.deliveryFee) && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {quoteError || errors.deliveryFee}
          </p>
        )}
      </div>
      
      {zipValid === true && (
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
                {deliveryWindows.length > 0 ? (
                  deliveryWindows.map((window) => (
                    <SelectItem key={window.value} value={window.value} disabled={!window.available}>
                      {window.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-windows" disabled>
                    No delivery windows available
                  </SelectItem>
                )}
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
