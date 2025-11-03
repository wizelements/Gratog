'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, ChevronRight, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function FloatingCart() {
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to load cart:', e);
      }
    }

    // Listen for cart updates from other components
    const handleCartUpdate = (event) => {
      setCart(event.detail.cart);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const updateQuantity = (productId, change) => {
    setCart(prevCart => {
      const newCart = prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = Math.max(0, item.quantity + change);
          return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: newCart } }));
      
      return newCart;
    });
  };

  const removeItem = (productId) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== productId);
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: newCart } }));
      toast.success('Item removed from cart');
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: [] } }));
    toast.success('Cart cleared');
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    setIsCheckingOut(true);
    
    // Save cart for checkout page
    localStorage.setItem('checkoutCart', JSON.stringify(cart));
    
    // Redirect to order page
    window.location.href = '/order';
  };

  return (
    <>
      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 hover:scale-110"
          size="icon"
        >
          <div className="relative">
            <ShoppingCart className="h-7 w-7" />
            {totalItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-red-500 animate-pulse">
                {totalItems}
              </Badge>
            )}
          </div>
        </Button>
      </div>

      {/* Cart Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Your Cart</h2>
                <p className="text-emerald-100 text-sm">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </p>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Price Summary */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex justify-between items-baseline">
                <span className="text-emerald-100">Subtotal</span>
                <span className="text-3xl font-bold">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <ShoppingCart className="h-20 w-20 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-6">Add some delicious sea moss products to get started!</p>
                <Button 
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/catalog';
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Browse Products
                </Button>
              </div>
            ) : (
              <>
                {cart.map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                              <Sparkles className="h-8 w-8 text-emerald-600" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1 truncate">
                            {item.name}
                          </h3>
                          <p className="text-emerald-600 font-bold text-lg mb-3">
                            ${item.price.toFixed(2)}
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                              <Button
                                onClick={() => updateQuantity(item.id, -1)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-white"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-semibold">
                                {item.quantity}
                              </span>
                              <Button
                                onClick={() => updateQuantity(item.id, 1)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-white"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <Button
                              onClick={() => removeItem(item.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="text-lg font-bold text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Clear Cart */}
                {cart.length > 0 && (
                  <Button
                    onClick={clearCart}
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Checkout Footer */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-6 space-y-4 bg-gray-50">
              {/* Promo Banner */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-900">
                    {totalPrice >= 60 ? (
                      <span className="text-green-700">🎉 You qualify for FREE shipping!</span>
                    ) : (
                      <span>Add ${(60 - totalPrice).toFixed(2)} for FREE shipping</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isCheckingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Secure checkout powered by Square
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}
    </>
  );
}
