/**
 * Square Customer API Integration
 * Creates and manages customer records in Square for proper order attribution
 */

import { getSquareClient } from './square';
import { logger } from './logger';
import { withRetry } from './critical-operations';
import type { Customer, Address, Country } from 'square';

const log = logger.withCategory('SquareCustomer');

/**
 * Normalize phone number to E.164 format for Square API
 * Square prefers E.164 format (+1XXXXXXXXXX for US numbers)
 * 
 * FIX M7: Ensures consistent phone number format for customer search
 */
function normalizePhoneNumber(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return undefined;
  
  // US phone number (10 digits)
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // US phone number with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Already has country code or international format
  if (digits.length > 10) {
    return `+${digits}`;
  }
  
  // Return as-is if we can't normalize (let Square validate)
  return phone;
}

export interface CustomerData {
  email: string;
  name: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  note?: string;
  referenceId?: string;
}

export type SquareCustomer = Customer;

/**
 * Find or create a customer in Square
 * This ensures orders are properly attributed to customers in Square dashboard
 * 
 * FIX M14: Wrapped with retry logic for transient failures
 * FIX M7: Phone numbers are normalized to E.164 format
 */
export async function findOrCreateSquareCustomer(
  customerData: CustomerData
): Promise<{ success: boolean; customer?: SquareCustomer; error?: string }> {
  // Wrap the entire operation with retry for transient failures
  return withRetry(
    () => findOrCreateSquareCustomerInternal(customerData),
    'square_customer_create',
    { maxAttempts: 3, baseDelayMs: 500 }
  ).catch((error) => {
    // Return error result instead of throwing after all retries exhausted
    log.error('Square customer operation failed after retries', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      customerEmail: customerData.email
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  });
}

/**
 * Internal implementation - separated for retry wrapper
 */
async function findOrCreateSquareCustomerInternal(
  customerData: CustomerData
): Promise<{ success: boolean; customer?: SquareCustomer; error?: string }> {
  const square = getSquareClient();
  
  // Parse name into first and last
  const nameParts = customerData.name.trim().split(' ');
  const givenName = nameParts[0] || '';
  const familyName = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name if no last name
  
  // FIX M7: Normalize phone number to E.164 format
  const normalizedPhone = normalizePhoneNumber(customerData.phone);
  
  log.info('Finding or creating Square customer', { 
    email: customerData.email,
    givenName,
    familyName,
    phoneOriginal: customerData.phone,
    phoneNormalized: normalizedPhone
  });
    
    // Step 1: Search for existing customer by email
    try {
      const searchResponse = await square.customers.search({
        query: {
          filter: {
            emailAddress: {
              exact: customerData.email.toLowerCase().trim()
            }
          }
        }
      });
      
      if (searchResponse.customers && searchResponse.customers.length > 0) {
        const existingCustomer = searchResponse.customers[0];
        log.info('Found existing Square customer', { 
          customerId: existingCustomer.id,
          email: existingCustomer.emailAddress 
        });
        
        // Update customer info if it has changed
        try {
          const address: Address | undefined = customerData.address ? {
            addressLine1: customerData.address.street,
            locality: customerData.address.city,
            administrativeDistrictLevel1: customerData.address.state,
            postalCode: customerData.address.zip,
            country: (customerData.address.country || 'US') as Country
          } : undefined;
          
          const updateResponse = await square.customers.update({
            customerId: existingCustomer.id!,
            givenName,
            familyName,
            phoneNumber: normalizedPhone, // Use normalized phone
            ...(address && { address }),
            ...(customerData.note && {
              note: customerData.note.substring(0, 500) // Max 500 chars
            })
          });
          
          log.info('Updated Square customer info', { customerId: existingCustomer.id });
          
          return {
            success: true,
            customer: updateResponse.customer
          };
        } catch (updateError) {
          log.warn('Failed to update customer info, using existing', { error: updateError });
          return {
            success: true,
            customer: existingCustomer
          };
        }
      }
    } catch (searchError) {
      log.warn('Customer search failed, will create new', { error: searchError });
    }
    
    // Step 2: Create new customer if not found
    const createAddress: Address | undefined = customerData.address ? {
      addressLine1: customerData.address.street,
      locality: customerData.address.city,
      administrativeDistrictLevel1: customerData.address.state || 'GA',
      postalCode: customerData.address.zip,
      country: (customerData.address.country || 'US') as Country
    } : undefined;
    
    const createResponse = await square.customers.create({
      idempotencyKey: `cust_${customerData.email.toLowerCase()}_${Date.now()}`,
      givenName,
      familyName,
      emailAddress: customerData.email.toLowerCase().trim(),
      phoneNumber: normalizedPhone, // Use normalized phone
      referenceId: customerData.referenceId || `web_${Date.now()}`,
      ...(createAddress && { address: createAddress }),
      ...(customerData.note && {
        note: customerData.note.substring(0, 500) // Max 500 chars
      })
    });
    
    if (!createResponse.customer) {
      throw new Error('Failed to create customer - no customer returned');
    }
    
    const newCustomer = createResponse.customer;
    log.info('✅ Created new Square customer', { 
      customerId: newCustomer.id,
      email: newCustomer.emailAddress 
    });
    
    return {
      success: true,
      customer: newCustomer
    };
}

/**
 * Get customer by ID
 */
export async function getSquareCustomer(customerId: string): Promise<SquareCustomer | null> {
  try {
    const square = getSquareClient();
    const response = await square.customers.get({ customerId });
    return response.customer || null;
  } catch (error) {
    log.error('Failed to retrieve Square customer', { customerId, error });
    return null;
  }
}

/**
 * Create a note from order context for customer record
 */
export function createCustomerNote(orderData: {
  orderNumber?: string;
  fulfillmentType?: string;
  source?: string;
}): string {
  const parts = [];
  
  if (orderData.source) {
    parts.push(`Source: ${orderData.source}`);
  }
  if (orderData.orderNumber) {
    parts.push(`Order: ${orderData.orderNumber}`);
  }
  if (orderData.fulfillmentType) {
    parts.push(`Type: ${orderData.fulfillmentType}`);
  }
  
  return parts.join(' | ');
}
