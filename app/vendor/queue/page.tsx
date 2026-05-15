/**
 * 🚀 Gratog Vendor Queue — Real-time Staff Order Management
 * 
 * FEATURES:
 * - Real-time order queue with polling
 * - Order status management: received → preparing → ready → picked up
 * - Sound notifications for new orders
 * - Mobile-optimized for tablet/phone use at market
 * - Staff mode authentication
 * - Batch operations for efficiency
 */

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Package,
  RefreshCw,
  Store,
  Volume2,
  VolumeX,
  LogOut,
  Bell,
  MoreVertical,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

type OrderStatus = 'received' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';

interface OrderItem {
  name: string;
  quantity: number;
  customizations?: string[];
}

interface QueueOrder {
  _id: string;
  orderId: string;
  orderRef: string;
  marketId: string;
  marketName: string;
  position: number;
  status: OrderStatus;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
  items: OrderItem[];
  estimatedReadyAt?: string;
  createdAt: string;
  notes?: string;
}

interface QueueStats {
  total: number;
  received: number;
  preparing: number;
  ready: number;
  pickedUp: number;
  avgWaitMinutes: number;
}

interface QueueData {
  queue: {
    received: QueueOrder[];
    preparing: QueueOrder[];
    ready: QueueOrder[];
  };
  stats: QueueStats;
  marketId: string;
  updatedAt: string;
}

// ============================================
// CONSTANTS
// ============================================

const POLL_INTERVAL = 5000; // 5 seconds
const SOUND_ENABLED_KEY = 'gratog-queue-sound-enabled';
const STAFF_TOKEN_KEY = 'gratog-staff-token';
const MARKET_ID_KEY = 'gratog-staff-market-id';

// ============================================
// ZUSTAND STORE (Queue State)
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueueStore {
  // State
  orders: QueueOrder[];
  isLoading: boolean;
  lastFetched: number;
  error: string | null;
  soundEnabled: boolean;
  selectedOrders: Set<string>;
  filterText: string;
  
  // Actions
  setOrders: (orders: QueueOrder[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleSound: () => void;
  toggleOrderSelection: (orderId: string) => void;
  clearSelection: () => void;
  selectAll: (orderIds: string[]) => void;
  setFilterText: (text: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

const useQueueStore = create<QueueStore>()(
  persist(
    (set, get) => ({
      orders: [],
      isLoading: true,
      lastFetched: 0,
      error: null,
      soundEnabled: true,
      selectedOrders: new Set(),
      filterText: '',

      setOrders: (orders) => set({ 
        orders, 
        lastFetched: Date.now(),
        isLoading: false,
        error: null 
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error, isLoading: false }),

      toggleSound: () => set((state) => ({ 
        soundEnabled: !state.soundEnabled 
      })),

      toggleOrderSelection: (orderId) => set((state) => {
        const newSelected = new Set(state.selectedOrders);
        if (newSelected.has(orderId)) {
          newSelected.delete(orderId);
        } else {
          newSelected.add(orderId);
        }
        return { selectedOrders: newSelected };
      }),

      clearSelection: () => set({ selectedOrders: new Set() }),

      selectAll: (orderIds) => set((state) => {
        const newSelected = new Set(state.selectedOrders);
        orderIds.forEach(id => newSelected.add(id));
        return { selectedOrders: newSelected };
      }),

      setFilterText: (filterText) => set({ filterText }),

      updateOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map(o => 
          o.orderId === orderId ? { ...o, status } : o
        )
      })),
    }),
    {
      name: 'gratog-queue-store',
      partialize: (state) => ({ 
        soundEnabled: state.soundEnabled 
      }),
    }
  )
);

// ============================================
// SOUND NOTIFICATION
// ============================================

class QueueSound {
  private ctx: AudioContext | null = null;
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNewOrder() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Pleasant ascending chime
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.2); // G5
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playStatusChange(status: OrderStatus) {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const frequencies: Record<OrderStatus, number> = {
      received: 440,
      preparing: 554, // C#5
      ready: 659.25, // E5
      picked_up: 880, // A5
      cancelled: 220,
    };
    
    osc.frequency.value = frequencies[status] || 440;
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
}

const queueSound = new QueueSound();

// ============================================
// STAFF AUTH HOOK
// ============================================

function useStaffAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [marketId, setMarketId] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem(STAFF_TOKEN_KEY);
    const savedMarketId = localStorage.getItem(MARKET_ID_KEY);
    
    if (token && savedMarketId) {
      setIsAuthenticated(true);
      setMarketId(savedMarketId);
    }
    setIsLoading(false);
  }, []);

  const login = async (pin: string, marketIdInput: string): Promise<boolean> => {
    // Simple PIN validation - in production, this would validate against your auth API
    const validPin = process.env.NEXT_PUBLIC_STAFF_PIN || '1234';
    
    if (pin === validPin && marketIdInput) {
      localStorage.setItem(STAFF_TOKEN_KEY, `staff_${Date.now()}`);
      localStorage.setItem(MARKET_ID_KEY, marketIdInput);
      setIsAuthenticated(true);
      setMarketId(marketIdInput);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    setIsAuthenticated(false);
    setMarketId('');
  };

  return { isAuthenticated, isLoading, marketId, login, logout };
}

// ============================================
// LOGIN SCREEN
// ============================================

function StaffLogin({ onLogin }: { onLogin: (pin: string, marketId: string) => Promise<boolean> }) {
  const [pin, setPin] = useState('');
  const [marketId, setMarketId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const success = await onLogin(pin, marketId);
    if (!success) {
      setError('Invalid PIN or Market ID');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Staff Login</h1>
            <p className="text-gray-400 text-sm">Vendor Queue Management</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Market ID
                </label>
                <Input
                  placeholder="e.g., market_001"
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Staff PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white text-center text-2xl tracking-[0.5em]"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={pin.length < 4 || !marketId || isSubmitting}
              >
                {isSubmitting ? 'Verifying...' : 'Access Queue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ============================================
// QUEUE COLUMN COMPONENT
// ============================================

interface QueueColumnProps {
  title: string;
  orders: QueueOrder[];
  status: OrderStatus;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'green';
  actionLabel: string;
  nextStatus: OrderStatus;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  selectedOrders: Set<string>;
  onToggleSelect: (orderId: string) => void;
}

function QueueColumn({
  title,
  orders,
  status,
  icon: Icon,
  color,
  actionLabel,
  nextStatus,
  onUpdateStatus,
  selectedOrders,
  onToggleSelect,
}: QueueColumnProps) {
  const colorClasses = {
    blue: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      headerBg: 'bg-blue-500/20',
      badge: 'bg-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      headerBg: 'bg-amber-500/20',
      badge: 'bg-amber-500',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    green: {
      border: 'border-green-500/30',
      bg: 'bg-green-500/10',
      headerBg: 'bg-green-500/20',
      badge: 'bg-green-500',
      button: 'bg-green-600 hover:bg-green-700',
    },
  };

  const colors = colorClasses[color];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getWaitTime = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  return (
    <div className={`flex flex-col h-full rounded-xl border-2 ${colors.border} ${colors.bg}`}>
      {/* Header */}
      <div className={`${colors.headerBg} px-4 py-3 rounded-t-xl flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-white" />
          <span className="font-bold text-white">{title}</span>
        </div>
        <Badge className={`${colors.badge} text-white`}>
          {orders.length}
        </Badge>
      </div>

      {/* Orders */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] max-h-[calc(100vh-280px)]">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <motion.div
              key={order.orderId}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Order Header */}
              <div className="p-3 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">
                        #{order.orderRef}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(order.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {order.customerInfo?.name || 'Guest'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.orderId)}
                    onChange={() => onToggleSelect(order.orderId)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-amber-600 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    {getWaitTime(order.createdAt)}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="p-3 bg-gray-800/50">
                {order.items.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-300">
                      {item.quantity}x {item.name}
                    </span>
                  </div>
                ))}
                {order.items.length > 4 && (
                  <p className="text-xs text-gray-500 mt-1">
                    +{order.items.length - 4} more items
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="p-3 border-t border-gray-700">
                <Button
                  size="sm"
                  className={`w-full ${colors.button} text-white font-medium`}
                  onClick={() => onUpdateStatus(order.orderId, nextStatus)}
                >
                  {actionLabel}
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Icon className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">No orders</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN QUEUE PAGE
// ============================================

export default function VendorQueuePage() {
  const { isAuthenticated, isLoading: authLoading, marketId, login, logout } = useStaffAuth();
  const {
    orders,
    isLoading,
    soundEnabled,
    selectedOrders,
    filterText,
    setOrders,
    setLoading,
    setError,
    toggleSound,
    toggleOrderSelection,
    clearSelection,
    updateOrderStatus: updateLocalStatus,
  } = useQueueStore();

  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const prevOrderCount = useRef(0);

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    if (!marketId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/queue/active?marketId=${marketId}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setQueueData(data);
        
        // Map API status to our OrderStatus type
        const allOrders: QueueOrder[] = [
          ...(data.queue.queued || []).map((o: any) => ({ ...o, status: 'received' as OrderStatus })),
          ...(data.queue.making || []).map((o: any) => ({ ...o, status: 'preparing' as OrderStatus })),
          ...(data.queue.ready || []).map((o: any) => ({ ...o, status: 'ready' as OrderStatus })),
        ];
        
        // Check for new orders and play sound
        const currentCount = allOrders.length;
        if (currentCount > prevOrderCount.current && prevOrderCount.current > 0) {
          if (soundEnabled) {
            queueSound.playNewOrder();
            toast.success('New order received!', { duration: 3000 });
          }
        }
        prevOrderCount.current = currentCount;
        
        setOrders(allOrders);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  }, [marketId, soundEnabled, setOrders, setLoading, setError]);

  // Polling effect
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchQueue();
    const interval = setInterval(fetchQueue, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchQueue]);

  // Update order status
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const apiStatus = status === 'received' ? 'queued' : 
                       status === 'preparing' ? 'making' : status;
      
      const response = await fetch('/api/queue/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: apiStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Update failed');
      }
      
      updateLocalStatus(orderId, status);
      
      if (soundEnabled) {
        queueSound.playStatusChange(status);
      }
      
      // Refresh to get updated data
      fetchQueue();
      
      const statusLabels: Record<OrderStatus, string> = {
        received: 'Order received',
        preparing: 'Now preparing',
        ready: 'Order ready',
        picked_up: 'Order picked up',
        cancelled: 'Order cancelled',
      };
      
      toast.success(statusLabels[status]);
    } catch (err) {
      toast.error('Failed to update order');
    }
  };

  // Batch update
  const handleBatchUpdate = async (status: OrderStatus) => {
    const promises = Array.from(selectedOrders).map(orderId => 
      handleUpdateStatus(orderId, status)
    );
    await Promise.all(promises);
    clearSelection();
  };

  // Filter orders
  const filteredOrders = queueData ? {
    received: (queueData.queue.queued || [])
      .map((o: any) => ({ ...o, status: 'received' as OrderStatus }))
      .filter((o: QueueOrder) => 
        filterText === '' || 
        o.orderRef.toLowerCase().includes(filterText.toLowerCase()) ||
        o.customerInfo?.name?.toLowerCase().includes(filterText.toLowerCase())
      ),
    preparing: (queueData.queue.making || [])
      .map((o: any) => ({ ...o, status: 'preparing' as OrderStatus }))
      .filter((o: QueueOrder) => 
        filterText === '' || 
        o.orderRef.toLowerCase().includes(filterText.toLowerCase()) ||
        o.customerInfo?.name?.toLowerCase().includes(filterText.toLowerCase())
      ),
    ready: (queueData.queue.ready || [])
      .map((o: any) => ({ ...o, status: 'ready' as OrderStatus }))
      .filter((o: QueueOrder) => 
        filterText === '' || 
        o.orderRef.toLowerCase().includes(filterText.toLowerCase()) ||
        o.customerInfo?.name?.toLowerCase().includes(filterText.toLowerCase())
      ),
  } : { received: [], preparing: [], ready: [] };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <StaffLogin onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Vendor Queue</h1>
                <p className="text-xs text-gray-400">{marketId}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSound}
                className="text-gray-400 hover:text-white"
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </Button>
              
              {/* Refresh */}
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchQueue}
                disabled={isLoading}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* Logout */}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-gray-400 hover:text-red-400"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          {queueData?.stats && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              <Badge variant="secondary" className="bg-gray-800 text-gray-300 whitespace-nowrap">
                Total: {queueData.stats.total}
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 whitespace-nowrap">
                <Clock className="w-3 h-3 mr-1" />
                {queueData.stats.queued}
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 whitespace-nowrap">
                <ChefHat className="w-3 h-3 mr-1" />
                {queueData.stats.making}
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {queueData.stats.ready}
              </Badge>
            </div>
          )}

          {/* Filter */}
          <div className="mt-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Filter by order # or name..."
                value={filterText}
                onChange={(e) => useQueueStore.getState().setFilterText(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Desktop: 3 columns, Mobile: horizontal scroll */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QueueColumn
            title="Received"
            orders={filteredOrders.received}
            status="received"
            icon={Clock}
            color="blue"
            actionLabel="Start Preparing"
            nextStatus="preparing"
            onUpdateStatus={handleUpdateStatus}
            selectedOrders={selectedOrders}
            onToggleSelect={toggleOrderSelection}
          />
          
          <QueueColumn
            title="Preparing"
            orders={filteredOrders.preparing}
            status="preparing"
            icon={ChefHat}
            color="amber"
            actionLabel="Mark Ready"
            nextStatus="ready"
            onUpdateStatus={handleUpdateStatus}
            selectedOrders={selectedOrders}
            onToggleSelect={toggleOrderSelection}
          />
          
          <QueueColumn
            title="Ready"
            orders={filteredOrders.ready}
            status="ready"
            icon={Package}
            color="green"
            actionLabel="Picked Up"
            nextStatus="picked_up"
            onUpdateStatus={handleUpdateStatus}
            selectedOrders={selectedOrders}
            onToggleSelect={toggleOrderSelection}
          />
        </div>
      </main>

      {/* Batch Actions Footer */}
      <AnimatePresence>
        {selectedOrders.size > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 z-20"
          >
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <span className="font-medium">
                  {selectedOrders.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="border-gray-700"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBatchUpdate('preparing')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Mark Preparing
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBatchUpdate('ready')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark Ready
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBatchUpdate('picked_up')}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Picked Up
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last Updated */}
      <footer className="text-center py-4 text-xs text-gray-600">
        <p>Auto-refresh every 5 seconds</p>
        {queueData?.updatedAt && (
          <p>Last updated: {new Date(queueData.updatedAt).toLocaleTimeString()}</p>
        )}
      </footer>
    </div>
  );
}
