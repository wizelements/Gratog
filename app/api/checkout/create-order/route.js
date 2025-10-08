import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { PRODUCTS } from '@/lib/products';
import { getDeliveryZoneByZip, calculateDeliveryFee } from '@/lib/delivery-zones';

export async function POST(request) {
  try {
    const { cart, customer, fulfillmentType, deliveryAddress, deliveryTimeSlot, deliveryInstructions } = await request.json();
    
    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    
    // Calculate totals
    const lineItems = cart.map(item => {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) throw new Error(`Invalid product: ${item.id}`);
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.subtitle,
            images: [product.image]
          },
          unit_amount: product.price
        },
        quantity: item.quantity
      };
    });
    
    // Add delivery fee if applicable
    if (fulfillmentType === 'delivery') {
      const subtotal = cart.reduce((sum, item) => {
        const product = PRODUCTS.find(p => p.id === item.id);
        return sum + (product.price * item.quantity);
      }, 0);
      
      const deliveryFee = calculateDeliveryFee(deliveryAddress.zip, subtotal);
      
      if (deliveryFee > 0) {
        const zone = getDeliveryZoneByZip(deliveryAddress.zip);
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Delivery Fee - ${zone?.name || 'Atlanta Metro'}`,
              description: `Zone ${zone?.id || 5} • ${zone?.estimatedTime || '90+ min'}`
            },
            unit_amount: deliveryFee
          },
          quantity: 1
        });
      }
    }
    
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL;
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order`,
      customer_email: customer.email,
      metadata: {
        customerName: customer.name,
        customerPhone: customer.phone,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? JSON.stringify(deliveryAddress) : null,
        deliveryTimeSlot: deliveryTimeSlot || null,
        deliveryInstructions: deliveryInstructions || null,
        source: 'order_portal'
      }
    });
    
    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
