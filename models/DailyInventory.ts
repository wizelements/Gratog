import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem {
  productId: string;
  name: string;
  sku?: string;
  initialQuantity: number;
  soldCount: number;
  isSoldOut: boolean;
  price: number;
  category?: string;
}

export interface IDailyInventory extends Document {
  marketId: string;
  marketName: string;
  date: Date;
  items: IInventoryItem[];
  isClosed: boolean;
  totalRevenue: number;
  totalOrders: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String },
  initialQuantity: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  isSoldOut: { type: Boolean, default: false },
  price: { type: Number, required: true },
  category: { type: String },
});

const DailyInventorySchema = new Schema<IDailyInventory>({
  marketId: { type: String, required: true },
  marketName: { type: String, required: true },
  date: { type: Date, required: true },
  items: [InventoryItemSchema],
  isClosed: { type: Boolean, default: false },
  totalRevenue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  notes: { type: String },
}, {
  timestamps: true,
});

// Compound index for quick lookup
DailyInventorySchema.index({ marketId: 1, date: 1 });
DailyInventorySchema.index({ date: 1, isClosed: 1 });

export default mongoose.models.DailyInventory || mongoose.model<IDailyInventory>('DailyInventory', DailyInventorySchema);
