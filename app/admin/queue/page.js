'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  UserX,
  Coffee,
  RefreshCw,
  Store,
  Users,
  Timer,
  Volume2,
  VolumeX
} from 'lucide-react';

const POLL_INTERVAL = 5000; // 5 seconds

export default function StaffQueuePage() {
  const [marketId, setMarketId] = useState('');
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState(new Set());

  // Get marketId from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mid = params.get('marketId') || localStorage.getItem('staffMarketId');
    if (mid) {
      setMarketId(mid);
      localStorage.setItem('staffMarketId', mid);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!marketId) return;
    
    try {
      const response = await fetch(`/api/queue/active?marketId=${marketId}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error('Failed to fetch queue');
      
      const data = await response.json();
      if (data.success) {
        setQueueData(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch('/api/queue/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      // Play sound if enabled
      if (soundEnabled) {
        playSound(status);
      }
      
      // Refresh queue
      fetchQueue();
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const playSound = (status) => {
    const audio = new Audio();
    // Simple beep using Web Audio API
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    switch (status) {
      case 'making':
        osc.frequency.value = 600;
        break;
      case 'ready':
        osc.frequency.value = 800;
        break;
      case 'picked_up':
        osc.frequency.value = 1000;
        break;
      default:
        osc.frequency.value = 500;
    }
    
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
  };

  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const batchUpdate = async (status) => {
    for (const orderId of selectedOrders) {
      await updateOrderStatus(orderId, status);
    }
    setSelectedOrders(new Set());
  };

  if (!marketId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Select Market</h2>
            <Input 
              placeholder="Enter Market ID"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="mb-4 bg-gray-700 border-gray-600"
            />
            <Button 
              className="w-full" 
              onClick={() => {
                localStorage.setItem('staffMarketId', marketId);
                fetchQueue();
              }}
            >
              Load Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const { queue, stats } = queueData || { queue: { queued: [], making: [], ready: [] }, stats: {} };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" />
            Gratog Queue
          </h1>
          <p className="text-gray-400">{queueData?.marketId}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchQueue}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total || 0}</p>
            <p className="text-xs text-gray-400">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/30 border-blue-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.queued || 0}</p>
            <p className="text-xs text-gray-400">Queued</p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-900/30 border-amber-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.making || 0}</p>
            <p className="text-xs text-gray-400">Making</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-900/30 border-green-700">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.ready || 0}</p>
            <p className="text-xs text-gray-400">Ready</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Columns */}
      <div className="grid grid-cols-3 gap-4">
        {/* Queued Column */}
        <QueueColumn
          title="Queued"
          orders={queue.queued || []}
          color="blue"
          icon={Clock}
          actionLabel="Start"
          onAction={(id) => updateOrderStatus(id, 'making')}
          selectedOrders={selectedOrders}
          onToggleSelect={toggleOrderSelection}
        />

        {/* Making Column */}
        <QueueColumn
          title="Making"
          orders={queue.making || []}
          color="amber"
          icon={ChefHat}
          actionLabel="Done"
          onAction={(id) => updateOrderStatus(id, 'ready')}
          selectedOrders={selectedOrders}
          onToggleSelect={toggleOrderSelection}
        />

        {/* Ready Column */}
        <QueueColumn
          title="Ready"
          orders={queue.ready || []}
          color="green"
          icon={CheckCircle2}
          actionLabel="Picked Up"
          onAction={(id) => updateOrderStatus(id, 'picked_up')}
          selectedOrders={selectedOrders}
          onToggleSelect={toggleOrderSelection}
          secondaryActionLabel="No Show"
          onSecondaryAction={(id) => updateOrderStatus(id, 'no_show')}
        />
      </div>

      {/* Batch Actions */}
      {selectedOrders.size > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-4 left-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <span>{selectedOrders.size} selected</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedOrders(new Set())}
              >
                Clear
              </Button>
              <Button 
                size="sm"
                onClick={() => batchUpdate('ready')}
              >
                Mark Ready
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Auto-refresh every 5 seconds</p>
        {queueData?.updatedAt && (
          <p>Last updated: {new Date(queueData.updatedAt).toLocaleTimeString()}</p>
        )}
      </div>
    </div>
  );
}

function QueueColumn({ 
  title, 
  orders, 
  color, 
  icon: Icon, 
  actionLabel, 
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  selectedOrders,
  onToggleSelect
}) {
  const colorClasses = {
    blue: 'border-blue-700 bg-blue-900/20',
    amber: 'border-amber-700 bg-amber-900/20',
    green: 'border-green-700 bg-green-900/20'
  };

  const buttonClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
    green: 'bg-green-600 hover:bg-green-700'
  };

  return (
    <Card className={`${colorClasses[color]} border-2`}>
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <span className="font-bold">{title}</span>
          </div>
          <Badge variant="secondary">{orders.length}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
        <AnimatePresence>
          {orders.map((order) => (
            <motion.div
              key={order._id}
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-lg p-3 border border-gray-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-lg">#{order.orderRef}</p>
                  <p className="text-xs text-gray-400">
                    {order.customerInfo?.name || 'Guest'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedOrders.has(order.orderId)}
                  onChange={() => onToggleSelect(order.orderId)}
                  className="w-5 h-5 rounded"
                />
              </div>

              <div className="space-y-1 mb-3">
                {order.items?.slice(0, 3).map((item, idx) => (
                  <p key={idx} className="text-sm text-gray-300">
                    {item.quantity}x {item.name}
                  </p>
                ))}
                {order.items?.length > 3 && (
                  <p className="text-xs text-gray-500">+{order.items.length - 3} more</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={`flex-1 ${buttonClasses[color]}`}
                  onClick={() => onAction(order.orderId)}
                >
                  {actionLabel}
                </Button>
                
                {secondaryActionLabel && onSecondaryAction && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-400 hover:bg-red-900/20"
                    onClick={() => onSecondaryAction(order.orderId)}
                  >
                    {secondaryActionLabel}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {orders.length === 0 && (
          <p className="text-center text-gray-500 py-8">No orders</p>
        )}
      </CardContent>
    </Card>
  );
}
