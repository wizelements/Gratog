/**
 * Server-side Fulfillment Validation
 * Validates delivery, pickup, and shipping data on the backend
 */

import { 
  isValidDeliveryZip,
  isDeliveryWindowAvailable,
  getDeliveryConfig,
  isFulfillmentEnabled,
  sanitizeTip
} from './fulfillment';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate delivery fulfillment data
 */
export function validateDeliveryFulfillment(data: {
  zip: string;
  window: string;
  subtotal: number;
  tip?: number;
  street?: string;
  city?: string;
  state?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const config = getDeliveryConfig();
  
  // Check if delivery is enabled
  if (!isFulfillmentEnabled('delivery')) {
    errors.push({
      field: 'fulfillmentType',
      message: 'Home delivery is temporarily unavailable. Please choose Pickup or Shipping.'
    });
    return { valid: false, errors };
  }
  
  // Validate ZIP code
  if (!data.zip) {
    errors.push({
      field: 'zip',
      message: 'Delivery ZIP code is required.'
    });
  } else if (!isValidDeliveryZip(data.zip)) {
    errors.push({
      field: 'zip',
      message: "We're not in your area yet. Try Pickup or Shipping, or use a different address."
    });
  }
  
  // Validate minimum order threshold
  if (data.subtotal < config.minSubtotal) {
    errors.push({
      field: 'subtotal',
      message: `Minimum order for delivery is $${config.minSubtotal.toFixed(2)}`
    });
  }
  
  // Validate delivery window
  if (!data.window) {
    errors.push({
      field: 'window',
      message: 'Please select a delivery time window.'
    });
  } else if (!isDeliveryWindowAvailable(data.window)) {
    errors.push({
      field: 'window',
      message: 'Order cutoff for this window has passed. Please pick a later time.'
    });
  }
  
  // Validate tip if provided
  if (data.tip !== undefined && data.tip !== null) {
    if (typeof data.tip !== 'number' || data.tip < 0 || data.tip > 100) {
      errors.push({
        field: 'tip',
        message: 'Invalid tip amount. Must be between $0 and $100.'
      });
    }
  }
  
  // Validate address fields
  if (!data.street || data.street.length < 5) {
    errors.push({
      field: 'street',
      message: 'Please enter a valid street address.'
    });
  }
  
  if (!data.city) {
    errors.push({
      field: 'city',
      message: 'City is required for delivery.'
    });
  }
  
  if (!data.state) {
    errors.push({
      field: 'state',
      message: 'State is required for delivery.'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate pickup fulfillment data
 */
export function validatePickupFulfillment(data: {
  market: string;
  date?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!isFulfillmentEnabled('pickup')) {
    errors.push({
      field: 'fulfillmentType',
      message: 'Pickup is temporarily unavailable.'
    });
  }
  
  if (!data.market) {
    errors.push({
      field: 'market',
      message: 'Please select a pickup location.'
    });
  }
  
  if (data.date) {
    const pickupDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (pickupDate < today) {
      errors.push({
        field: 'date',
        message: 'Pickup date cannot be in the past.'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate shipping fulfillment data
 */
export function validateShippingFulfillment(data: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!isFulfillmentEnabled('shipping')) {
    errors.push({
      field: 'fulfillmentType',
      message: 'Shipping is temporarily unavailable.'
    });
  }
  
  if (!data.street || data.street.length < 5) {
    errors.push({
      field: 'street',
      message: 'Please enter a valid street address.'
    });
  }
  
  if (!data.city) {
    errors.push({
      field: 'city',
      message: 'City is required.'
    });
  }
  
  if (!data.state) {
    errors.push({
      field: 'state',
      message: 'State is required.'
    });
  }
  
  if (!data.zip || !/^\d{5}(-\d{4})?$/.test(data.zip)) {
    errors.push({
      field: 'zip',
      message: 'Please enter a valid ZIP code.'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate fulfillment data based on type
 */
export function validateFulfillment(
  type: 'pickup' | 'shipping' | 'delivery',
  data: any,
  subtotal: number
): ValidationResult {
  switch (type) {
    case 'delivery':
      return validateDeliveryFulfillment({ ...data, subtotal });
    case 'pickup':
      return validatePickupFulfillment(data);
    case 'shipping':
      return validateShippingFulfillment(data);
    default:
      return {
        valid: false,
        errors: [{
          field: 'fulfillmentType',
          message: 'Invalid fulfillment type.'
        }]
      };
  }
}

/**
 * Calculate delivery fee with validation
 */
export function calculateDeliveryFee(subtotal: number): number {
  const config = getDeliveryConfig();
  return subtotal >= config.freeThreshold ? 0 : config.baseFee;
}

/**
 * Sanitize and validate tip amount
 */
export function validateAndSanitizeTip(tip: any): number {
  if (tip === undefined || tip === null) return 0;
  
  const tipNum = typeof tip === 'string' ? parseFloat(tip) : tip;
  
  if (isNaN(tipNum) || tipNum < 0) return 0;
  if (tipNum > 100) return 100; // Cap at $100
  
  return sanitizeTip(tipNum);
}
