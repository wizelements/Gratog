import { NextRequest, NextResponse } from 'next/server';
import { 
  getShippingRates, 
  validateAddress, 
  calculatePackageDimensions,
  type ShippingAddress 
} from '@/lib/shipping-service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ShippingRatesAPI');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, items } = body;

    // Validate address input
    if (!address || !address.street || !address.city || !address.state || !address.zip) {
      return NextResponse.json(
        { error: 'Complete address is required (street, city, state, zip)' },
        { status: 400 }
      );
    }

    // Validate address format
    const addressValidation = await validateAddress(address as ShippingAddress);
    
    if (!addressValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid address',
          details: addressValidation.errors 
        },
        { status: 400 }
      );
    }

    // Use normalized address if available
    const shippingAddress = addressValidation.normalized || address;

    // Calculate package dimensions from cart items
    const packageDimensions = items && items.length > 0
      ? calculatePackageDimensions(items)
      : undefined;

    // Get shipping rates
    const rates = await getShippingRates(shippingAddress, packageDimensions);

    logger.info('Shipping rates retrieved', { 
      zip: address.zip, 
      rateCount: rates.length 
    });

    return NextResponse.json({
      success: true,
      address: shippingAddress,
      rates: rates.sort((a, b) => a.rate - b.rate), // Sort by price
      packageWeight: packageDimensions?.weight
    });
  } catch (error) {
    logger.error('Failed to get shipping rates', { 
      error: (error as Error).message 
    });

    return NextResponse.json(
      { error: 'Failed to calculate shipping rates' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'shipping-rates',
    method: 'POST',
    requiredFields: ['address.street', 'address.city', 'address.state', 'address.zip'],
    optionalFields: ['items[]']
  });
}
