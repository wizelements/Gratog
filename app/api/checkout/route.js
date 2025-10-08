import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { PRODUCTS } from '@/lib/products';

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, metadata = {} } = body;
    
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }
    
    // Validate and calculate line items from server-side product catalog
    const lineItems = items.map(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) {
        throw new Error(`Invalid product ID: ${item.id}`);
      }
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.subtitle,
            images: [product.image],
          },
          unit_amount: product.price, // Amount in cents from server
        },
        quantity: item.quantity || 1,
      };
    });
    
    // Get the origin URL for success and cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL;
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: {
        ...metadata,
        source: 'taste_of_gratitude',
      },
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
    });
    
    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
