'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CouponInput({ 
  onCouponApplied, 
  onCouponRemoved, 
  appliedCoupon = null,
  orderTotal = 0,
  customerEmail = null,
  disabled = false 
}) {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setIsValidating(true);
    
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          customerEmail,
          orderTotal
        })
      });

      const data = await response.json();
      
      if (data.valid) {
        toast.success(`✅ Coupon applied: ${data.discount.description}`);
        onCouponApplied && onCouponApplied({
          code: data.coupon.code,
          discountAmount: data.coupon.discountAmount,
          freeShipping: data.coupon.freeShipping,
          description: data.discount.description
        });
        setCouponCode('');
      } else {
        toast.error(data.error || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      toast.error('Failed to validate coupon. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    onCouponRemoved && onCouponRemoved();
    toast.info('Coupon removed');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      validateCoupon();
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Coupon Input */}
          {!appliedCoupon && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#D4AF37]" />
                <span className="text-sm font-medium">Have a coupon?</span>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  disabled={disabled || isValidating}
                  className="flex-1"
                  aria-label="Enter coupon code"
                />
                <Button
                  onClick={validateCoupon}
                  disabled={!couponCode.trim() || disabled || isValidating}
                  variant="outline"
                  className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Applied Coupon Display */}
          {appliedCoupon && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Coupon Applied</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-600 text-white">
                    <Check className="h-3 w-3 mr-1" />
                    {appliedCoupon.code}
                  </Badge>
                  <span className="text-sm text-green-700 font-medium">
                    {appliedCoupon.description}
                  </span>
                </div>
                
                {!disabled && (
                  <Button
                    onClick={removeCoupon}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Coupon Benefits Display */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Coupons expire 24 hours after creation</p>
            <p>• Cannot be combined with other offers</p>
            <p>• Spin the wheel daily for new coupons!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}