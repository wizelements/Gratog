'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coffee, 
  CheckCircle2, 
  Clock, 
  ChefHat,
  Phone,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

// Vibration patterns
const VIBRATION_PATTERNS = {
  DISTANT: [50],
  APPROACHING: [100, 50, 100],
  CLOSE: [150, 100, 150, 100, 150],
  NEXT: [200, 100, 200, 100, 300],
  READY: [200, 100, 200, 100, 200, 100, 500],
  MAKING: [100, 50, 300]
};

const STATUS_CONFIG = {
  queued: { 
    label: 'In Queue', 
    color: 'bg-blue-500',
    icon: Clock,
    message: 'We\'ve received your order!'
  },
  making: { 
    label: 'Being Made', 
    color: 'bg-amber-500',
    icon: ChefHat,
    message: 'Your boba is being prepared!'
  },
  ready: { 
    label: 'Ready!', 
    color: 'bg-green-500',
    icon: CheckCircle2,
    message: 'Your order is ready for pickup!'
  },
  picked_up: { 
    label: 'Picked Up', 
    color: 'bg-gray-500',
    icon: Coffee,
    message: 'Enjoy your boba!'
  }
};

export default function QueuePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;
  
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previousStatus, setPreviousStatus] = useState(null);
  const [previousPosition, setPreviousPosition] = useState(null);

  const fetchQueuePosition = useCallback(async () => {
    try {
      const response = await fetch(`/api/queue/position/${orderId}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue position');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Check for status change
        if (previousStatus && data.status !== previousStatus) {
          handleStatusChange(data.status, previousStatus);
        }
        
        // Check for position improvement
        if (previousPosition && data.ahead < previousPosition) {
          handlePositionDrop(data.ahead, previousPosition);
        }
        
        setPreviousStatus(data.status);
        setPreviousPosition(data.ahead);
        setQueueData(data);
      } else {
        setError(data.error || 'Order not found');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, previousStatus, previousPosition]);

  const handleStatusChange = (newStatus, oldStatus) => {
    // Vibrate on status changes
    if (navigator.vibrate) {
      if (newStatus === 'ready') {
        navigator.vibrate(VIBRATION_PATTERNS.READY);
      } else if (newStatus === 'making') {
        navigator.vibrate(VIBRATION_PATTERNS.MAKING);
      }
    }
    
    // Show notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      const config = STATUS_CONFIG[newStatus];
      if (config) {
        new Notification('Gratog', {
          body: config.message,
          icon: '/icon-192x192.png'
        });
      }
    }
  };

  const handlePositionDrop = (newAhead, oldAhead) => {
    if (!navigator.vibrate) return;
    
    const droppedBy = oldAhead - newAhead;
    
    // Progressive vibration based on position
    if (newAhead <= 2) {
      navigator.vibrate(VIBRATION_PATTERNS.NEXT);
    } else if (newAhead <= 5) {
      navigator.vibrate(VIBRATION_PATTERNS.CLOSE);
    } else if (droppedBy >= 3) {
      navigator.vibrate(VIBRATION_PATTERNS.APPROACHING);
    } else {
      navigator.vibrate(VIBRATION_PATTERNS.DISTANT);
    }
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    fetchQueuePosition();
    
    const interval = setInterval(fetchQueuePosition, 5000);
    return () => clearInterval(interval);
  }, [fetchQueuePosition]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-gray-600">Loading queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/markets')}>
              Back to Markets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!queueData) return null;

  const statusConfig = STATUS_CONFIG[queueData.status] || STATUS_CONFIG.queued;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-4 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{queueData.marketName}</h1>
          <p className="text-gray-600">Order #{queueData.orderRef}</p>
        </div>

        {/* Status Card */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full ${statusConfig.color} flex items-center justify-center`}>
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-center mb-2">
              {statusConfig.label}
            </h2>
            <p className="text-gray-600 text-center text-sm">
              {statusConfig.message}
            </p>
          </CardContent>
        </Card>

        {/* Queue Position */}
        {queueData.status !== 'picked_up' && (
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-6 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={queueData.ahead}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="mb-2"
                >
                  <span className="text-7xl font-bold text-amber-600">
                    {queueData.ahead}
                  </span>
                </motion.div>
              </AnimatePresence>
              
              <p className="text-gray-600 mb-2">
                {queueData.ahead === 0 
                  ? "You're next!" 
                  : `orders ahead of you`}
              </p>
              
              {queueData.estimatedMinutes > 0 && (
                <Badge variant="secondary" className="text-sm">
                  ≈ {queueData.estimatedMinutes} min wait
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Making Now */}
        {queueData.makingNow?.length > 0 && queueData.status !== 'ready' && (
          <Card className="mb-6 shadow">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-2">Being prepared now:</p>
              <div className="flex flex-wrap gap-2">
                {queueData.makingNow.map((order) => (
                  <Badge key={order._id} variant="outline" className="text-xs">
                    #{order.orderRef}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Ordered */}
        {queueData.items?.length > 0 && (
          <Card className="mb-6 shadow">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Your Order</h3>
              <div className="space-y-2">
                {queueData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {queueData.status === 'ready' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <Button 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => router.push('/markets')}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              I Picked Up My Order
            </Button>
            <p className="text-sm text-gray-600 mt-2">
              Show order #{queueData.orderRef} at the pickup window
            </p>
          </motion.div>
        )}

        {queueData.status === 'picked_up' && (
          <div className="text-center">
            <Button onClick={() => router.push('/markets')}>
              Order Again
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Keep this page open for updates</p>
          <p className="mt-1">Your phone will vibrate when ready</p>
        </div>
      </div>
    </div>
  );
}
