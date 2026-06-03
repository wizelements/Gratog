import { NextResponse } from 'next/server';
import { checkDeliveryRadius } from '@/lib/delivery-radius';
import { calculateDistanceBasedDeliveryFee } from '@/lib/delivery-fees';

export const dynamic = 'force-dynamic';

function fullAddress(address: any): string {
  return [
    address?.street,
    address?.suite,
    address?.city,
    address?.state || 'GA',
    address?.zip,
  ]
    .filter(Boolean)
    .join(', ');
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const address = data.address || {};
    const subtotal = Math.max(0, Number(data.subtotal) || 0);

    if (!address.street || !address.city || !address.zip) {
      return NextResponse.json(
        {
          success: false,
          eligible: false,
          error: 'Street, city, and ZIP are required for a delivery quote.',
        },
        { status: 400 }
      );
    }

    const radius = await checkDeliveryRadius(fullAddress(address));

    if (!radius.eligible) {
      return NextResponse.json(
        {
          success: false,
          eligible: false,
          error: radius.message,
          distanceMiles: radius.distance,
          nearestLocationName: radius.nearestLocationName,
        },
        { status: 400 }
      );
    }

    const deliveryFee = calculateDistanceBasedDeliveryFee(radius.distance, subtotal);

    return NextResponse.json({
      success: true,
      eligible: true,
      deliveryFee,
      distanceMiles: radius.distance,
      nearestLocationName: radius.nearestLocationName,
      message:
        deliveryFee === 0
          ? `Free delivery — ${radius.distance} miles away.`
          : `Delivery is $${deliveryFee.toFixed(2)} — ${radius.distance} miles away.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        eligible: false,
        error: error?.message || 'Unable to quote delivery for this address.',
      },
      { status: 500 }
    );
  }
}
