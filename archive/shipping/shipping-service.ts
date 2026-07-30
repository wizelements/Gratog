/**
 * Shipping Service
 * Handles shipping rate calculations and label creation
 * Supports ShipEngine/EasyPost integration with fallback to flat rates
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('ShippingService');

// Types
export interface ShippingAddress {
  name?: string;
  company?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
}

export interface PackageDimensions {
  weight: number; // in ounces
  length?: number; // in inches
  width?: number;
  height?: number;
}

export interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  serviceName: string;
  rate: number;
  estimatedDays: number;
  deliveryDate?: string;
}

export interface ShipmentResult {
  trackingNumber: string;
  labelUrl?: string;
  carrier: string;
  service: string;
  estimatedDelivery?: string;
}

export interface AddressValidation {
  valid: boolean;
  normalized?: ShippingAddress;
  errors?: string[];
  suggestions?: ShippingAddress[];
}

// Default flat rates when no shipping API is configured
const FLAT_RATES: ShippingRate[] = [
  {
    id: 'flat_standard',
    carrier: 'USPS',
    service: 'STANDARD',
    serviceName: 'Standard Shipping (5-7 business days)',
    rate: 6.99,
    estimatedDays: 7
  },
  {
    id: 'flat_express',
    carrier: 'USPS',
    service: 'EXPRESS',
    serviceName: 'Express Shipping (2-3 business days)',
    rate: 12.99,
    estimatedDays: 3
  },
  {
    id: 'flat_priority',
    carrier: 'USPS',
    service: 'PRIORITY',
    serviceName: 'Priority Overnight (1 business day)',
    rate: 24.99,
    estimatedDays: 1
  }
];

// Origin address (warehouse)
const ORIGIN_ADDRESS: ShippingAddress = {
  name: 'Taste of Gratitude',
  street: process.env.SHIPPING_ORIGIN_STREET || '123 Wellness Way',
  city: process.env.SHIPPING_ORIGIN_CITY || 'Atlanta',
  state: process.env.SHIPPING_ORIGIN_STATE || 'GA',
  zip: process.env.SHIPPING_ORIGIN_ZIP || '30301',
  country: 'US'
};

// Default package dimensions for sea moss products
const DEFAULT_PACKAGE: PackageDimensions = {
  weight: 16, // 1 lb
  length: 8,
  width: 6,
  height: 4
};

/**
 * Check if shipping API is configured
 */
export function isShippingApiConfigured(): boolean {
  return !!(process.env.SHIPENGINE_API_KEY || process.env.EASYPOST_API_KEY);
}

/**
 * Get shipping rates for an address
 */
export async function getShippingRates(
  toAddress: ShippingAddress,
  packageDimensions: PackageDimensions = DEFAULT_PACKAGE
): Promise<ShippingRate[]> {
  logger.info('Getting shipping rates', { to: toAddress.zip });

  // Use API if configured
  if (process.env.SHIPENGINE_API_KEY) {
    return await getShipEngineRates(toAddress, packageDimensions);
  }

  if (process.env.EASYPOST_API_KEY) {
    return await getEasyPostRates(toAddress, packageDimensions);
  }

  // Return flat rates as fallback
  logger.info('Using flat rate shipping (no API configured)');
  return FLAT_RATES.map(rate => ({
    ...rate,
    deliveryDate: calculateDeliveryDate(rate.estimatedDays)
  }));
}

/**
 * Get rates from ShipEngine API
 */
async function getShipEngineRates(
  toAddress: ShippingAddress,
  packageDimensions: PackageDimensions
): Promise<ShippingRate[]> {
  try {
    const response = await fetch('https://api.shipengine.com/v1/rates', {
      method: 'POST',
      headers: {
        'API-Key': process.env.SHIPENGINE_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rate_options: {
          carrier_ids: process.env.SHIPENGINE_CARRIER_IDS?.split(',') || []
        },
        shipment: {
          ship_from: {
            name: ORIGIN_ADDRESS.name,
            address_line1: ORIGIN_ADDRESS.street,
            city_locality: ORIGIN_ADDRESS.city,
            state_province: ORIGIN_ADDRESS.state,
            postal_code: ORIGIN_ADDRESS.zip,
            country_code: 'US'
          },
          ship_to: {
            name: toAddress.name || 'Customer',
            address_line1: toAddress.street,
            address_line2: toAddress.street2,
            city_locality: toAddress.city,
            state_province: toAddress.state,
            postal_code: toAddress.zip,
            country_code: toAddress.country || 'US'
          },
          packages: [{
            weight: {
              value: packageDimensions.weight,
              unit: 'ounce'
            },
            dimensions: {
              length: packageDimensions.length || 8,
              width: packageDimensions.width || 6,
              height: packageDimensions.height || 4,
              unit: 'inch'
            }
          }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ShipEngine API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = data.rate_response?.rates || [];

    return rates.map((rate: any) => ({
      id: rate.rate_id,
      carrier: rate.carrier_friendly_name,
      service: rate.service_code,
      serviceName: rate.service_type,
      rate: rate.shipping_amount.amount,
      estimatedDays: rate.delivery_days || 7,
      deliveryDate: rate.estimated_delivery_date
    }));
  } catch (error) {
    logger.error('ShipEngine API error, falling back to flat rates', { error: (error as Error).message });
    return FLAT_RATES;
  }
}

/**
 * Get rates from EasyPost API
 */
async function getEasyPostRates(
  toAddress: ShippingAddress,
  packageDimensions: PackageDimensions
): Promise<ShippingRate[]> {
  try {
    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shipment: {
          from_address: {
            name: ORIGIN_ADDRESS.name,
            street1: ORIGIN_ADDRESS.street,
            city: ORIGIN_ADDRESS.city,
            state: ORIGIN_ADDRESS.state,
            zip: ORIGIN_ADDRESS.zip,
            country: 'US'
          },
          to_address: {
            name: toAddress.name || 'Customer',
            street1: toAddress.street,
            street2: toAddress.street2,
            city: toAddress.city,
            state: toAddress.state,
            zip: toAddress.zip,
            country: toAddress.country || 'US'
          },
          parcel: {
            weight: packageDimensions.weight,
            length: packageDimensions.length || 8,
            width: packageDimensions.width || 6,
            height: packageDimensions.height || 4
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`EasyPost API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = data.rates || [];

    return rates.map((rate: any) => ({
      id: rate.id,
      carrier: rate.carrier,
      service: rate.service,
      serviceName: `${rate.carrier} ${rate.service}`,
      rate: parseFloat(rate.rate),
      estimatedDays: rate.delivery_days || 7,
      deliveryDate: rate.delivery_date
    }));
  } catch (error) {
    logger.error('EasyPost API error, falling back to flat rates', { error: (error as Error).message });
    return FLAT_RATES;
  }
}

/**
 * Validate a shipping address
 */
export async function validateAddress(address: ShippingAddress): Promise<AddressValidation> {
  logger.info('Validating address', { zip: address.zip });

  // Basic validation
  const errors: string[] = [];

  if (!address.street || address.street.length < 5) {
    errors.push('Street address is required');
  }

  if (!address.city) {
    errors.push('City is required');
  }

  if (!address.state || address.state.length !== 2) {
    errors.push('Valid state code is required (e.g., GA)');
  }

  if (!address.zip || !/^\d{5}(-\d{4})?$/.test(address.zip)) {
    errors.push('Valid ZIP code is required');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Use API validation if available
  if (process.env.SHIPENGINE_API_KEY) {
    try {
      const response = await fetch('https://api.shipengine.com/v1/addresses/validate', {
        method: 'POST',
        headers: {
          'API-Key': process.env.SHIPENGINE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          address_line1: address.street,
          address_line2: address.street2,
          city_locality: address.city,
          state_province: address.state,
          postal_code: address.zip,
          country_code: address.country || 'US'
        }])
      });

      if (response.ok) {
        const [result] = await response.json();
        
        if (result.status === 'verified') {
          return {
            valid: true,
            normalized: {
              street: result.matched_address.address_line1,
              street2: result.matched_address.address_line2,
              city: result.matched_address.city_locality,
              state: result.matched_address.state_province,
              zip: result.matched_address.postal_code,
              country: result.matched_address.country_code
            }
          };
        }
      }
    } catch (error) {
      logger.warn('Address validation API error', { error: (error as Error).message });
    }
  }

  // Return as valid if basic validation passed
  return { valid: true, normalized: address };
}

/**
 * Create a shipment and get tracking
 */
export async function createShipment(
  orderId: string,
  rateId: string,
  toAddress: ShippingAddress
): Promise<ShipmentResult> {
  logger.info('Creating shipment', { orderId, rateId });

  // For flat rates, generate mock tracking
  if (rateId.startsWith('flat_')) {
    const trackingNumber = `TOG${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const rate = FLAT_RATES.find(r => r.id === rateId) || FLAT_RATES[0];
    
    return {
      trackingNumber,
      carrier: rate.carrier,
      service: rate.service,
      estimatedDelivery: calculateDeliveryDate(rate.estimatedDays)
    };
  }

  // Use ShipEngine for label creation
  if (process.env.SHIPENGINE_API_KEY) {
    try {
      const response = await fetch(`https://api.shipengine.com/v1/labels/rates/${rateId}`, {
        method: 'POST',
        headers: {
          'API-Key': process.env.SHIPENGINE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          label_format: 'pdf',
          label_download_type: 'url'
        })
      });

      if (response.ok) {
        const label = await response.json();
        return {
          trackingNumber: label.tracking_number,
          labelUrl: label.label_download.pdf,
          carrier: label.carrier_code,
          service: label.service_code,
          estimatedDelivery: label.estimated_delivery_date
        };
      }
    } catch (error) {
      logger.error('Failed to create shipment', { error: (error as Error).message });
    }
  }

  // Fallback mock tracking
  return {
    trackingNumber: `TOG${Date.now()}`,
    carrier: 'USPS',
    service: 'STANDARD',
    estimatedDelivery: calculateDeliveryDate(7)
  };
}

/**
 * Get tracking information
 */
export async function getTrackingInfo(trackingNumber: string): Promise<any> {
  logger.info('Getting tracking info', { trackingNumber });

  if (process.env.SHIPENGINE_API_KEY) {
    try {
      const response = await fetch(
        `https://api.shipengine.com/v1/tracking?tracking_number=${trackingNumber}`,
        {
          headers: {
            'API-Key': process.env.SHIPENGINE_API_KEY
          }
        }
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      logger.error('Failed to get tracking', { error: (error as Error).message });
    }
  }

  // Return mock tracking for demo
  return {
    trackingNumber,
    status: 'in_transit',
    statusDescription: 'Package is on its way',
    events: [
      {
        occurredAt: new Date().toISOString(),
        description: 'Package shipped'
      }
    ]
  };
}

/**
 * Calculate estimated delivery date
 */
function calculateDeliveryDate(days: number): string {
  const date = new Date();
  let businessDays = 0;
  
  while (businessDays < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Calculate package dimensions from cart items
 */
export function calculatePackageDimensions(items: { weight?: number; quantity: number }[]): PackageDimensions {
  let totalWeight = 0;
  
  for (const item of items) {
    totalWeight += (item.weight || 8) * item.quantity; // Default 8oz per item
  }

  // Add packaging weight
  totalWeight += 4;

  return {
    weight: totalWeight,
    length: 10,
    width: 8,
    height: Math.min(6 + Math.floor(items.length / 2), 12)
  };
}

const shippingService = {
  isShippingApiConfigured,
  getShippingRates,
  validateAddress,
  createShipment,
  getTrackingInfo,
  calculatePackageDimensions
};

export default shippingService;
