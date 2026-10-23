export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { 
  getShippingRates, 
  validateAddress, 
  calculatePackageDimensions,
  type ShippingAddress 
} from '@/lib/shipping-service';
import { createLogger } from '@/lib/logger';
import { validateGeorgiaDestination } from '@/lib/georgia-orders';
import { priceCart } from '@/lib/cart-pricing';
import { shippingMethodKey } from '@/lib/shipping-service';

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

    const destination = validateGeorgiaDestination(address);
    if (!destination.valid) {
      return NextResponse.json({ success: false, code: destination.code, error: destination.message }, { status: 422 });
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

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is required to check shipping eligibility.' }, { status: 400 });
    }
    const pricedCart = await priceCart({ items, deliveryFeeCents: 0 });
    const unapproved = pricedCart.items.filter(line => !line.shippingEligible || line.marketExclusive || line.isPreorder);
    if (unapproved.length) {
      return NextResponse.json({
        success: false,
        code: 'PRODUCT_NOT_APPROVED_FOR_SHIPPING',
        error: 'Your cart contains products not yet approved for Georgia parcel shipping. Choose eligible local delivery or pickup.',
        products: unapproved.map(item => item.name),
      }, { status: 422 });
    }
    // Never use client-supplied weights or rates; authoritative product quantities only.
    const packageDimensions = calculatePackageDimensions(pricedCart.items);
    const rates = (await getShippingRates({ ...shippingAddress, street2: shippingAddress.suite || shippingAddress.street2 }, packageDimensions))
      .filter(rate => Number.isFinite(rate.rate) && rate.rate > 0)
      .map(rate => ({ ...rate, methodKey: shippingMethodKey(rate) }));
    if (!rates.length) return NextResponse.json({ success: false, error: 'No carrier services are available for this cart.' }, { status: 503 });

    logger.info('Shipping rates retrieved', { 
      zip: address.zip, 
      rateCount: rates.length 
    });

    return NextResponse.json({
      success: true,
      address: shippingAddress,
      rates: rates.sort((a, b) => a.rate - b.rate), // Verified live quotes only
      packageWeight: packageDimensions?.weight
    });
  } catch (error) {
    logger.error('Failed to get shipping rates', { 
      error: (error as Error).message 
    });

    return NextResponse.json(
      { success: false, code: 'SHIPPING_UNAVAILABLE', error: 'Verified carrier shipping rates are currently unavailable. Please choose delivery or pickup.' },
      { status: 503 }
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
