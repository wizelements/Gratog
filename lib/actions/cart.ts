/**
 * Server Actions for Cart Operations
 * 
 * These replace simple API routes with Server Actions
 * Benefits:
 * - Progressive enhancement (works without JS)
 * - Automatic revalidation
 * - Simpler code
 * 
 * Use for:
 * - Adding/removing cart items
 * - Updating quantities
 * - Clear cart
 */

'use server';

import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';

interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  catalogObjectId?: string;
  category?: string;
}

interface CartState {
  items: CartItem[];
}

const CART_COOKIE_NAME = 'tog_cart_v3';
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Get cart from cookies (server-side)
 */
async function getCartFromCookies(): Promise<CartState> {
  const cookieStore = await cookies();
  const cartData = cookieStore.get(CART_COOKIE_NAME)?.value;
  
  if (!cartData) {
    return { items: [] };
  }
  
  try {
    const parsed = JSON.parse(cartData);
    return { items: parsed.state?.items || [] };
  } catch {
    return { items: [] };
  }
}

/**
 * Save cart to cookies (server-side)
 */
async function saveCartToCookies(cart: CartState): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: JSON.stringify({ state: cart, version: 3 }),
    maxAge: CART_COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

/**
 * Add item to cart
 */
export async function addToCart(item: CartItem): Promise<{ success: boolean; message: string; cartCount: number }> {
  try {
    const cart = await getCartFromCookies();
    
    const existingItem = cart.items.find(i => i.productId === item.productId);
    
    if (existingItem) {
      // Update quantity
      existingItem.quantity += item.quantity;
    } else {
      // Add new item
      cart.items.push(item);
    }
    
    await saveCartToCookies(cart);
    revalidateTag('cart');
    
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    
    return {
      success: true,
      message: existingItem ? 'Quantity updated' : 'Added to cart',
      cartCount: totalItems,
    };
  } catch (error) {
    console.error('[Server Action] Add to cart error:', error);
    return {
      success: false,
      message: 'Failed to add item',
      cartCount: 0,
    };
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(productId: string): Promise<{ success: boolean; cartCount: number }> {
  try {
    const cart = await getCartFromCookies();
    
    cart.items = cart.items.filter(i => i.productId !== productId);
    
    await saveCartToCookies(cart);
    revalidateTag('cart');
    
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    
    return { success: true, cartCount: totalItems };
  } catch (error) {
    console.error('[Server Action] Remove from cart error:', error);
    return { success: false, cartCount: 0 };
  }
}

/**
 * Update item quantity
 */
export async function updateCartQuantity(
  productId: string, 
  quantity: number
): Promise<{ success: boolean; cartCount: number }> {
  try {
    const cart = await getCartFromCookies();
    
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.productId !== productId);
    } else {
      const item = cart.items.find(i => i.productId === productId);
      if (item) {
        item.quantity = quantity;
      }
    }
    
    await saveCartToCookies(cart);
    revalidateTag('cart');
    
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    
    return { success: true, cartCount: totalItems };
  } catch (error) {
    console.error('[Server Action] Update quantity error:', error);
    return { success: false, cartCount: 0 };
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(CART_COOKIE_NAME);
    revalidateTag('cart');
    
    return { success: true };
  } catch (error) {
    console.error('[Server Action] Clear cart error:', error);
    return { success: false };
  }
}

/**
 * Get cart summary (for server components)
 */
export async function getCartSummary(): Promise<{ items: CartItem[]; total: number; itemCount: number }> {
  const cart = await getCartFromCookies();
  
  const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  
  return {
    items: cart.items,
    total,
    itemCount,
  };
}
