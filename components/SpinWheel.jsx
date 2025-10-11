'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const WHEEL_SEGMENTS = [
  { id: 1, label: '$2 OFF', value: 200, color: '#D4AF37', probability: 0.25 },
  { id: 2, label: '$5 OFF', value: 500, color: '#FF6B6B', probability: 0.15 },
  { id: 3, label: '$1 OFF', value: 100, color: '#4ECDC4', probability: 0.30 },
  { id: 4, label: 'FREE SHIPPING', value: 0, color: '#45B7D1', probability: 0.15, freeShipping: true },
  { id: 5, label: 'TRY AGAIN', value: 0, color: '#96CEB4', probability: 0.10 },
  { id: 6, label: '$3 OFF', value: 300, color: '#FFEAA7', probability: 0.05 }
];

export default function SpinWheel({ onWin, disabled = false, customerEmail }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [prize, setPrize] = useState(null);
  const wheelRef = useRef(null);

  // Check if customer has already spun today
  useEffect(() => {
    if (customerEmail) {
      const spinHistory = localStorage.getItem(`spin_history_${customerEmail}`);
      if (spinHistory) {
        const lastSpin = JSON.parse(spinHistory);
        const today = new Date().toDateString();
        if (lastSpin.date === today) {
          setHasSpun(true);
          setPrize(lastSpin.prize);
        }
      }
    }
  }, [customerEmail]);

  const getRandomPrize = () => {
    const random = Math.random();
    let cumulative = 0;
    
    for (const segment of WHEEL_SEGMENTS) {
      cumulative += segment.probability;
      if (random <= cumulative) {
        return segment;
      }
    }
    
    return WHEEL_SEGMENTS[0]; // Fallback
  };

  const handleSpin = async () => {
    if (isSpinning || hasSpun || disabled) return;

    setIsSpinning(true);
    
    // Determine the prize
    const wonPrize = getRandomPrize();
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const prizeIndex = WHEEL_SEGMENTS.findIndex(s => s.id === wonPrize.id);
    
    // Calculate rotation to land on the prize
    const targetAngle = (prizeIndex * segmentAngle) + (segmentAngle / 2);
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const finalRotation = (spins * 360) + (360 - targetAngle);
    
    setRotation(rotation + finalRotation);
    
    // Wait for animation to complete
    setTimeout(async () => {
      setIsSpinning(false);
      setHasSpun(true);
      setPrize(wonPrize);
      
      // Save spin history
      if (customerEmail) {
        const spinHistory = {
          date: new Date().toDateString(),
          prize: wonPrize
        };
        localStorage.setItem(`spin_history_${customerEmail}`, JSON.stringify(spinHistory));
      }
      
      // Create coupon if there's a discount
      if (wonPrize.value > 0 || wonPrize.freeShipping) {
        try {
          const response = await fetch('/api/coupons/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerEmail,
              discountAmount: wonPrize.value,
              freeShipping: wonPrize.freeShipping || false,
              type: 'spin_wheel',
              source: 'wheel_spin'
            })
          });
          
          const couponData = await response.json();
          
          if (response.ok) {
            toast.success(`🎉 Congratulations! You won ${wonPrize.label}!`);
            onWin && onWin({
              ...wonPrize,
              couponCode: couponData.coupon?.code,
              couponId: couponData.coupon?.id
            });
          } else {
            toast.error('Failed to create coupon. Please contact support.');
          }
        } catch (error) {
          console.error('Error creating coupon:', error);
          toast.error('Something went wrong. Please try again.');
        }
      } else {
        toast.info('Better luck next time! Try again tomorrow.');
      }
    }, 3000);
  };

  const reset = () => {
    if (customerEmail) {
      localStorage.removeItem(`spin_history_${customerEmail}`);
    }
    setHasSpun(false);
    setPrize(null);
    setRotation(0);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-[#D4AF37]">
          <Gift className="h-6 w-6" />
          Spin to Win!
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Spin the wheel for a chance to win discounts and prizes!
        </p>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center space-y-6">
        {/* Wheel Container */}
        <div className="relative w-64 h-64">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-[#D4AF37]"></div>
          </div>
          
          {/* Wheel */}
          <div 
            ref={wheelRef}
            className={`w-64 h-64 rounded-full relative overflow-hidden shadow-2xl border-4 border-[#D4AF37] transition-transform duration-3000 ease-out ${isSpinning ? 'animate-pulse' : ''}`}
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {WHEEL_SEGMENTS.map((segment, index) => {
              const angle = (360 / WHEEL_SEGMENTS.length) * index;
              const segmentAngle = 360 / WHEEL_SEGMENTS.length;
              
              return (
                <div
                  key={segment.id}
                  className="absolute w-full h-full"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 40 * Math.cos((segmentAngle * Math.PI) / 180)}% ${50 - 40 * Math.sin((segmentAngle * Math.PI) / 180)}%)`
                  }}
                >
                  <div 
                    className="w-full h-full flex items-center justify-center relative"
                    style={{ backgroundColor: segment.color }}
                  >
                    <div 
                      className="text-white font-bold text-xs text-center absolute"
                      style={{ 
                        transform: `rotate(${segmentAngle / 2}deg) translateY(-60px) rotate(90deg)`,
                        transformOrigin: 'center'
                      }}
                    >
                      {segment.label}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-[#D4AF37] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={isSpinning || hasSpun || disabled}
          className="bg-[#D4AF37] hover:bg-[#B8941F] text-white font-bold py-3 px-8 rounded-full transform transition-transform hover:scale-105"
        >
          {isSpinning ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              Spinning...
            </>
          ) : hasSpun ? (
            'Come back tomorrow!'
          ) : (
            'SPIN NOW!'
          )}
        </Button>

        {/* Prize Display */}
        {prize && (
          <div className="text-center space-y-2">
            <Badge 
              className="text-lg px-4 py-2"
              style={{ backgroundColor: prize.color, color: 'white' }}
            >
              🎉 You Won: {prize.label}!
            </Badge>
            <p className="text-sm text-muted-foreground">
              {prize.value > 0 && "Your discount has been applied to your cart!"}
              {prize.freeShipping && "Free shipping applied to your order!"}
              {prize.value === 0 && !prize.freeShipping && "Better luck tomorrow!"}
            </p>
          </div>
        )}

        {/* Rules */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• One spin per customer per day</p>
          <p>• Coupons expire in 24 hours</p>
          <p>• Cannot be combined with other offers</p>
        </div>

        {/* Admin Reset (Development only) */}
        {process.env.NODE_ENV === 'development' && hasSpun && (
          <Button variant="outline" size="sm" onClick={reset}>
            Reset (Dev Only)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}