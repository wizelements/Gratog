import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 
  | 'PENDING_PAYMENT'
  | 'PENDING_CONFIRMATION' 
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod = 'SQUARE_ONLINE' | 'CASH' | 'VENMO' | 'PAY_AT_PICKUP';

export interface IOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface IMarketOrder extends Document {
  orderNumber: string;
  marketId: string;
  marketName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  squareOrderId?: string;
  estimatedReadyAt?: Date;
  pickedUpAt?: Date;
  notes?: string;
  queuePosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

const MarketOrderSchema = new Schema<IMarketOrder>({
  orderNumber: { type: String, required: true, unique: true },
  marketId: { type: String, required: true },
  marketName: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String },
  items: [OrderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING_CONFIRMATION'
  },
  paymentMethod: { 
    type: String, 
    enum: ['SQUARE_ONLINE', 'CASH', 'VENMO', 'PAY_AT_PICKUP'],
    required: true
  },
  paymentStatus: { 
    type: String, 
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  squareOrderId: { type: String },
  estimatedReadyAt: { type: Date },
  pickedUpAt: { type: Date },
  notes: { type: String },
  queuePosition: { type: Number },
}, {
  timestamps: true,
});

// Indexes for performance
MarketOrderSchema.index({ marketId: 1, status: 1, createdAt: -1 });
MarketOrderSchema.index({ status: 1, createdAt: -1 });
MarketOrderSchema.index({ customerPhone: 1 });
MarketOrderSchema.index({ orderNumber: 1 });

export default mongoose.models.MarketOrder || mongoose.model<IMarketOrder>('MarketOrder', MarketOrderSchema);
