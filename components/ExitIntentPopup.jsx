'use client';

import { useState } from 'react';
import { Gift, ShoppingBag, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExitIntent } from '@/hooks/useExitIntent';

export default function ExitIntentPopup() {
  const { showExitIntent, dismiss } = useExitIntent();
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveCart = async () => {
    if (!email) return;
    
    setIsSaving(true);
    try {
      const cart = localStorage.getItem('cart');
      console.log('Saving cart for email:', email, 'Cart:', cart);
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaved(true);
    } catch (error) {
      console.error('Failed to save cart:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueShopping = () => {
    dismiss();
  };

  return (
    <Dialog open={showExitIntent} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Gift className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-emerald-900">
            Wait! Don&apos;t leave your goodies behind
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            We&apos;d hate to see you go. Here&apos;s a special offer just for you!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 p-4 text-center">
          <p className="text-sm font-medium text-emerald-700">Use code at checkout</p>
          <p className="mt-1 text-3xl font-bold tracking-wider text-emerald-900">DONTGO10</p>
          <p className="mt-1 text-sm text-emerald-600">for 10% off your order</p>
        </div>

        {!saved ? (
          <div className="mt-4 space-y-3">
            <p className="text-center text-sm text-gray-500">
              Save your cart for later (optional)
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleSaveCart}
                disabled={!email || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-center">
            <p className="text-sm font-medium text-green-700">
              ✓ Cart saved! Check your email for a link.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Button
            onClick={handleContinueShopping}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
          <button
            onClick={dismiss}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            No thanks, I&apos;ll pass
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
