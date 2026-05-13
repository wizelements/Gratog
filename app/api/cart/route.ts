import { NextRequest, NextResponse } from 'next/server';

// In-memory cart store (use Redis in production)
const carts = new Map();

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id') || 'anonymous';
    const cart = carts.get(sessionId) || { items: [], total: 0 };
    return NextResponse.json(cart);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = request.headers.get('x-session-id') || 'anonymous';
    
    // Get or create cart
    let cart = carts.get(sessionId) || { items: [], total: 0 };
    
    // Add item to cart
    if (body.item) {
      cart.items.push(body.item);
      cart.total = cart.items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
    }
    
    carts.set(sessionId, cart);
    return NextResponse.json(cart);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id') || 'anonymous';
    carts.delete(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}
