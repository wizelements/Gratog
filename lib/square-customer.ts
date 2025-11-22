/**
 * Square Customer API Integration
 * Creates and manages customer records in Square for proper order attribution
 */

import { getSquareClient } from './square';
import { createLogger } from './logger';

const logger = createLogger('SquareCustomer');

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

export interface SquareCustomer {
  id: string;
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  address?: any;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Find or create a customer in Square
 * This ensures orders are properly attributed to customers in Square dashboard
 */
export async function findOrCreateSquareCustomer(
  customerData: CustomerData
): Promise<{ success: boolean; customer?: SquareCustomer; error?: string }> {
  try {
    const square = getSquareClient();
    
    // Parse name into first and last
    const nameParts = customerData.name.trim().split(' ');
    const givenName = nameParts[0] || '';
    const familyName = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name if no last name
    
    logger.info('Finding or creating Square customer', { 
      email: customerData.email,
      givenName,
      familyName 
    });
    
    // Step 1: Search for existing customer by email
    try {
      const searchResponse = await (square.customers as any).searchCustomers({
        query: {
          filter: {
            emailAddress: {
              exact: customerData.email.toLowerCase().trim()
            }
          }
        }
      });
      
      if (searchResponse.result?.customers && searchResponse.result.customers.length > 0) {
        const existingCustomer = searchResponse.result.customers[0];
        logger.info('Found existing Square customer', { 
          customerId: existingCustomer.id,
          email: existingCustomer.emailAddress 
        });
        
        // Update customer info if it has changed
        try {
          const updatePayload: any = {
            givenName,
            familyName,
            phoneNumber: customerData.phone
          };
          
          if (customerData.address) {
            updatePayload.address = {
              addressLine1: customerData.address.street,
              locality: customerData.address.city,
              administrativeDistrictLevel1: customerData.address.state,
              postalCode: customerData.address.zip,
              country: customerData.address.country || 'US'
            };
          }
          
          if (customerData.note) {
            updatePayload.note = customerData.note.substring(0, 500); // Max 500 chars
          }
          
          const updateResponse = await (square.customers as any).updateCustomer({
            customerId: existingCustomer.id,
            ...updatePayload
          }) as any;
          
          logger.info('Updated Square customer info', { customerId: existingCustomer.id });
          
          return {
            success: true,
            customer: updateResponse.result?.customer
          };
        } catch (updateError) {
          logger.warn('Failed to update customer info, using existing', { error: updateError });
          return {
            success: true,
            customer: existingCustomer
          };
        }
      }
    } catch (searchError) {
      logger.warn('Customer search failed, will create new', { error: searchError });
    }
    
    // Step 2: Create new customer if not found
    const createPayload: any = {
      idempotencyKey: `cust_${customerData.email.toLowerCase()}_${Date.now()}`,
      givenName,
      familyName,
      emailAddress: customerData.email.toLowerCase().trim(),
      phoneNumber: customerData.phone,
      referenceId: customerData.referenceId || `web_${Date.now()}`
    };
    
    if (customerData.address) {
      createPayload.address = {
        addressLine1: customerData.address.street,
        locality: customerData.address.city,
        administrativeDistrictLevel1: customerData.address.state || 'GA',
        postalCode: customerData.address.zip,
        country: customerData.address.country || 'US'
      };
    }
    
    if (customerData.note) {
      createPayload.note = customerData.note.substring(0, 500); // Max 500 chars
    }
    
    const createResponse = await (square.customers as any).createCustomer(createPayload) as any;
    
    if (!createResponse.result?.customer) {
      throw new Error('Failed to create customer - no customer returned');
    }
    
    const newCustomer = createResponse.result.customer;
    logger.info('✅ Created new Square customer', { 
      customerId: newCustomer.id,
      email: newCustomer.emailAddress 
    });
    
    return {
      success: true,
      customer: newCustomer
    };
    
  } catch (error) {
    logger.error('Square customer operation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      customerEmail: customerData.email
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get customer by ID
 */
export async function getSquareCustomer(customerId: string): Promise<SquareCustomer | null> {
  try {
    const square = getSquareClient();
    const response = await (square.customers as any).retrieveCustomer({ customerId }) as any;
    return response.result?.customer || null;
  } catch (error) {
    logger.error('Failed to retrieve Square customer', { customerId, error });
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
