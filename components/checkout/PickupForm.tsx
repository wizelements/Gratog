<<<<<<< HEAD
=======
// @ts-nocheck
>>>>>>> upstream/main
'use client';

/**
 * PickupForm - Location and date selection for pickup orders
 */

import { motion } from 'framer-motion';
import { MapPin, Calendar, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PickupData } from '@/stores/checkout';
import { Fulfillment } from '@/adapters/fulfillmentAdapter';
import { useState, useEffect } from 'react';

interface PickupFormProps {
  data: PickupData;
  onChange: (data: Partial<PickupData>) => void;
  errors?: Record<string, string>;
}

export default function PickupForm({ data, onChange, errors = {} }: PickupFormProps) {
  const locations = Fulfillment.pickupLocations();
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  
  useEffect(() => {
    if (data.locationId) {
      const dates = Fulfillment.marketCalendar(data.locationId);
      setAvailableDates(dates);
      
      // Auto-select first date if none selected
      if (!data.date && dates.length > 0) {
        onChange({ date: dates[0] });
      }
    }
  }, [data.locationId]);
  
  const selectedLocation = locations.find(loc => loc.id === data.locationId);
  
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pickup Details</h3>
        <p className="text-sm text-gray-600">
          Select a market location and pickup date
        </p>
      </div>
      
      {/* Location Selector */}
      <div>
        <Label htmlFor="location" className="text-sm font-medium text-gray-700">
          Pickup Location *
        </Label>
        <Select
          value={data.locationId}
          onValueChange={(value) => onChange({ locationId: value })}
        >
          <SelectTrigger
            id="location"
            className={`mt-1 ${errors.locationId ? 'border-red-500' : ''}`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <SelectValue placeholder="Choose a market location" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{location.name}</span>
                  <span className="text-xs text-gray-500">{location.address}</span>
                  <span className="text-xs text-emerald-600 mt-0.5">{location.hours}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.locationId && (
          <p className="mt-1 text-xs text-red-500">{errors.locationId}</p>
        )}
        
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200"
          >
            <p className="text-sm text-emerald-800">
              <span className="font-medium">📍 {selectedLocation.name}</span>
            </p>
            <p className="text-xs text-emerald-700 mt-1">{selectedLocation.address}</p>
            <p className="text-xs text-emerald-600 mt-1">⏰ {selectedLocation.hours}</p>
          </motion.div>
        )}
      </div>
      
      {/* Date Selector */}
      {data.locationId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Label htmlFor="date" className="text-sm font-medium text-gray-700">
            Pickup Date *
          </Label>
          <Select
            value={data.date?.toISOString()}
            onValueChange={(value) => onChange({ date: new Date(value) })}
          >
            <SelectTrigger
              id="date"
              className={`mt-1 ${errors.date ? 'border-red-500' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <SelectValue placeholder="Choose pickup date" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableDates.map((date) => (
                <SelectItem key={date.toISOString()} value={date.toISOString()}>
                  {date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.date && (
            <p className="mt-1 text-xs text-red-500">{errors.date}</p>
          )}
        </motion.div>
      )}
      
      {/* Special Instructions */}
      <div>
        <Label htmlFor="instructions" className="text-sm font-medium text-gray-700">
          Special Instructions <span className="text-gray-500">(Optional)</span>
        </Label>
        <div className="relative mt-1">
          <Textarea
            id="instructions"
            value={data.instructions || ''}
            onChange={(e) => onChange({ instructions: e.target.value })}
            placeholder="Any special notes for pickup? (e.g., 'Please call when ready')"
            rows={3}
            className="resize-none"
          />
        </div>
      </div>
    </motion.div>
  );
}
