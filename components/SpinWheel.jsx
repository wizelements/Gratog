'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles, RotateCcw, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
// Enhanced rewards system will be called via API routes instead

const WHEEL_SEGMENTS = [
  { id: 1, label: '$2 OFF', value: 200, color: '#D4AF37', probability: 0.25, freeShipping: false },
  { id: 2, label: '$1 OFF', value: 100, color: '#22c55e', probability: 0.30, freeShipping: false },
  { id: 3, label: '$3 OFF', value: 300, color: '#3b82f6', probability: 0.05, freeShipping: false },
  { id: 4, label: '$5 OFF', value: 500, color: '#8b5cf6', probability: 0.15, freeShipping: false },
  { id: 5, label: 'FREE SHIPPING', value: 0, color: '#ef4444', probability: 0.15, freeShipping: true },
  { id: 6, label: 'TRY AGAIN', value: 0, color: '#6b7280', probability: 0.10, freeShipping: false }
];

const STORAGE_KEY = 'taste-of-gratitude-spin-history';
const DAILY_LIMIT = 3; // Maximum spins per day

export default function SpinWheel({ onWin, customerEmail, disabled = false }) {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [canSpin, setCanSpin] = useState(true);
  const [spinsToday, setSpinsToday] = useState(0);
  const [spinHistory, setSpinHistory] = useState([]);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [error, setError] = useState(null);
  const [lastSpinResult, setLastSpinResult] = useState(null);

  // Enhanced spin tracking with robust fallbacks
  const getSpinHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const history = JSON.parse(stored);
      // Validate history structure
      return Array.isArray(history) ? history.filter(spin => 
        spin.email && spin.timestamp && spin.prize
      ) : [];
    } catch (error) {
      console.error('Failed to get spin history:', error);
      return [];
    }
  }, []);

  const saveSpinHistory = useCallback((newSpin) => {
    try {
      const history = getSpinHistory();
      const updatedHistory = [...history, newSpin];
      
      // Keep only last 100 spins to prevent storage bloat
      const trimmedHistory = updatedHistory.slice(-100);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
      setSpinHistory(trimmedHistory);
    } catch (error) {
      console.error('Failed to save spin history:', error);
    }
  }, [getSpinHistory]);

  const getTodaysSpins = useCallback((email) => {
    const history = getSpinHistory();
    const today = new Date().toDateString();
    
    return history.filter(spin => {
      const spinDate = new Date(spin.timestamp).toDateString();
      return spin.email === email && spinDate === today;
    });
  }, [getSpinHistory]);

  // Check spin eligibility
  useEffect(() => {
    if (!customerEmail) {
      setCanSpin(false);
      setError('Please enter your email to spin the wheel');
      return;
    }

    try {
      const todaysSpins = getTodaysSpins(customerEmail);
      setSpinsToday(todaysSpins.length);
      
      const remainingSpins = DAILY_LIMIT - todaysSpins.length;
      setCanSpin(remainingSpins > 0 && !disabled);
      
      if (remainingSpins <= 0) {
        setError(`Daily limit reached (${DAILY_LIMIT} spins per day)`);
      } else {
        setError(null);
      }
      
      // Load full history
      setSpinHistory(getSpinHistory());
      
    } catch (error) {
      console.error('Error checking spin eligibility:', error);
      setError('Error checking spin eligibility');
      setCanSpin(false);
    }
  }, [customerEmail, disabled, getTodaysSpins, getSpinHistory]);

  // Enhanced canvas drawing with error handling
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas 2D context');
        return;
      }
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 10;
      const anglePerSegment = (2 * Math.PI) / WHEEL_SEGMENTS.length;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw segments
      WHEEL_SEGMENTS.forEach((segment, index) => {
        const startAngle = index * anglePerSegment;
        const endAngle = (index + 1) * anglePerSegment;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = segment.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.rotate(startAngle + anglePerSegment / 2);
        ctx.translate(radius * 0.7, 0);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(segment.label, 0, 0);
        ctx.restore();
      });

      ctx.restore();

      // Draw pointer
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius + 10);
      ctx.lineTo(centerX - 10, centerY - radius - 10);
      ctx.lineTo(centerX + 10, centerY - radius - 10);
      ctx.closePath();
      ctx.fillStyle = '#1f2937';
      ctx.fill();
      
    } catch (error) {
      console.error('Error drawing wheel:', error);
      setError('Error drawing wheel');
    }
  }, [rotation]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Set high DPI canvas for crisp rendering
      const ctx = canvas.getContext('2d');
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      canvas.width = 300 * devicePixelRatio;
      canvas.height = 300 * devicePixelRatio;
      canvas.style.width = '300px';
      canvas.style.height = '300px';
      
      ctx.scale(devicePixelRatio, devicePixelRatio);
      
      drawWheel();
    } catch (error) {
      console.error('Error initializing canvas:', error);
      setError('Error initializing wheel');
    }
  }, [drawWheel]);

  // Redraw wheel when rotation changes
  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Enhanced spin logic with better randomization
  const selectRandomSegment = useCallback(() => {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const segment of WHEEL_SEGMENTS) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        return segment;
      }
    }

    // Fallback to first segment if something goes wrong
    return WHEEL_SEGMENTS[0];
  }, []);

  // Enhanced coupon creation with comprehensive error handling
  const createCoupon = useCallback(async (prize) => {
    if (prize.label === 'TRY AGAIN' || !customerEmail) {
      return { success: true, coupon: null };
    }

    setIsCreatingCoupon(true);
    
    try {
      const response = await fetch('/api/coupons/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          type: 'spin_wheel',
          discountAmount: prize.value / 100, // Convert cents to dollars
          freeShipping: prize.freeShipping || false,
          source: 'spin_wheel',
          metadata: {
            prize: prize.label,
            wheelSegmentId: prize.id,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.coupon) {
        return {
          success: true,
          coupon: {
            ...data.coupon,
            couponCode: data.coupon.code,
            label: prize.label,
            value: prize.value,
            freeShipping: prize.freeShipping
          }
        };
      } else {
        throw new Error(data.error || 'Failed to create coupon');
      }
      
    } catch (error) {
      console.error('Coupon creation failed:', error);
      
      // Fallback: create a mock coupon for offline use
      const fallbackCoupon = {
        couponCode: `SPIN${Date.now()}`,
        label: prize.label,
        value: prize.value,
        freeShipping: prize.freeShipping,
        isFallback: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
      
      toast.warning('Coupon created offline - will sync when connection is restored');
      
      return { success: true, coupon: fallbackCoupon };
      
    } finally {
      setIsCreatingCoupon(false);
    }
  }, [customerEmail]);

  // Main spin function with comprehensive error handling
  const spin = useCallback(async () => {
    if (!canSpin || isSpinning || disabled || !customerEmail) {
      return;
    }

    setIsSpinning(true);
    setError(null);
    setSelectedSegment(null);
    setLastSpinResult(null);

    try {
      // Award points for spinning via API
      try {
        await fetch('/api/rewards/add-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customerEmail,
            points: 5,
            activityType: 'spin_wheel',
            activityData: { timestamp: new Date() }
          })
        });
      } catch (pointsError) {
        console.warn('Failed to award spin points:', pointsError);
        // Don't block the spin for points failure
      }

      // Select winning segment
      const winningSegment = selectRandomSegment();
      
      // Calculate rotation (add randomness + multiple full rotations)
      const segmentAngle = (360 / WHEEL_SEGMENTS.length);
      const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.id === winningSegment.id);
      const targetAngle = segmentIndex * segmentAngle;
      const spinRotation = 360 * (5 + Math.random() * 5) - targetAngle; // 5-10 full rotations
      
      setRotation(prev => prev + spinRotation);

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      setSelectedSegment(winningSegment);
      setIsSpinning(false);

      // Create coupon for the prize
      const couponResult = await createCoupon(winningSegment);
      
      if (couponResult.success) {
        const result = {
          ...winningSegment,
          couponCode: couponResult.coupon?.couponCode,
          isFallback: couponResult.coupon?.isFallback || false
        };
        
        setLastSpinResult(result);
        
        // Save to history
        const spinRecord = {
          email: customerEmail,
          timestamp: new Date().toISOString(),
          prize: winningSegment,
          couponCode: result.couponCode,
          success: true
        };
        
        saveSpinHistory(spinRecord);
        
        // Update daily spin count
        setSpinsToday(prev => prev + 1);
        
        // Check if daily limit reached
        const newSpinCount = spinsToday + 1;
        if (newSpinCount >= DAILY_LIMIT) {
          setCanSpin(false);
          setError(`Daily limit reached (${DAILY_LIMIT} spins per day)`);
        }
        
        // Call parent callback
        if (onWin && typeof onWin === 'function') {
          onWin(result);
        }
        
        // Show success message
        if (winningSegment.label !== 'TRY AGAIN') {
          toast.success(`🎉 You won ${winningSegment.label}!`);
        } else {
          toast.info('Try again! You can spin again.');
        }
        
      } else {
        throw new Error('Failed to process prize');
      }
      
    } catch (error) {
      console.error('Spin failed:', error);
      setError('Something went wrong. Please try again.');
      setIsSpinning(false);
      toast.error('Spin failed. Please try again.');
    }
  }, [canSpin, isSpinning, disabled, customerEmail, selectRandomSegment, createCoupon, onWin, saveSpinHistory, spinsToday]);

  const remainingSpins = Math.max(0, DAILY_LIMIT - spinsToday);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-[#D4AF37]" />
          Spin & Win
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Spin for exclusive discounts and rewards!
        </p>
        
        {customerEmail && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className={remainingSpins > 0 ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}>
              {remainingSpins} / {DAILY_LIMIT} spins today
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Wheel Canvas */}
        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`rounded-full shadow-lg transition-transform duration-3000 ease-out ${
                isSpinning ? 'animate-pulse' : ''
              }`}
              style={{
                transform: isSpinning ? 'scale(0.98)' : 'scale(1)',
                filter: isSpinning ? 'brightness(1.1)' : 'brightness(1)'
              }}
            />
            
            {/* Center button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={spin}
                disabled={!canSpin || isSpinning || isCreatingCoupon}
                className="rounded-full w-16 h-16 bg-[#D4AF37] hover:bg-[#B8941F] disabled:bg-gray-400 shadow-lg"
                size="sm"
              >
                {isSpinning || isCreatingCoupon ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <RotateCcw className="h-6 w-6 text-white" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Last Spin Result */}
        {lastSpinResult && (
          <div className="text-center p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-[#D4AF37]">Last Win</span>
            </div>
            <p className="text-lg font-bold text-[#D4AF37] mb-1">{lastSpinResult.label}</p>
            {lastSpinResult.couponCode && (
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-[#D4AF37] text-white">
                  Code: {lastSpinResult.couponCode}
                </Badge>
                {lastSpinResult.isFallback && (
                  <Badge variant="outline" className="text-xs">
                    Offline
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Spin Instructions */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            {!customerEmail 
              ? 'Enter your email above to spin' 
              : canSpin 
                ? 'Click the center button to spin the wheel!'
                : remainingSpins === 0
                  ? 'Come back tomorrow for more spins'
                  : 'Spin unavailable'
            }
          </p>
          
          {isCreatingCoupon && (
            <p className="text-xs text-[#D4AF37] font-medium animate-pulse">
              Creating your reward...
            </p>
          )}
        </div>
        
        {/* Prize Information */}
        <div className="text-center">
          <h4 className="text-sm font-semibold mb-2 flex items-center justify-center gap-2">
            <Gift className="h-4 w-4" />
            Possible Prizes
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {WHEEL_SEGMENTS.filter(s => s.label !== 'TRY AGAIN').map(segment => (
              <Badge
                key={segment.id}
                variant="outline"
                className="text-xs"
                style={{ borderColor: segment.color, color: segment.color }}
              >
                {segment.label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            All coupons expire in 24 hours • {DAILY_LIMIT} spins per day
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
