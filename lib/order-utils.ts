import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';

/**
 * Generate a unique order number for the day
 * Format: T[YYMMDD]-[4-digit sequential]
 */
export async function generateOrderNumber(): Promise<string> {
  await connectToDatabase();
  
  const today = new Date();
  const datePrefix = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  
  // Find the highest order number for today
  const lastOrder = await MarketOrder.findOne({
    orderNumber: { $regex: `^T${datePrefix}` },
  }).sort({ orderNumber: -1 });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[1]);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  
  return `T${datePrefix}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Calculate estimated ready time based on queue depth
 */
export function calculateEstimatedReadyTime(
  currentQueueLength: number,
  avgPrepTimeMinutes: number = 5
): Date {
  const baseTime = Date.now();
  const queueDelay = currentQueueLength * avgPrepTimeMinutes * 60000;
  const prepTime = avgPrepTimeMinutes * 60000;
  
  return new Date(baseTime + queueDelay + prepTime);
}

/**
 * Format order for display
 */
export function formatOrderForDisplay(order: any) {
  return {
    id: order._id?.toString(),
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
    queuePosition: order.queuePosition,
    estimatedReadyAt: order.estimatedReadyAt,
    createdAt: order.createdAt,
  };
}
