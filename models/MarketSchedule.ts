import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketSchedule extends Document {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  hours: {
    open: string; // 24h format "09:00"
    close: string; // 24h format "14:00"
  };
  days: string[]; // ["Saturday", "Sunday"]
  timezone: string; // "America/New_York"
  contactPhone?: string;
  parkingInfo?: string;
  photoUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MarketScheduleSchema = new Schema<IMarketSchedule>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  hours: {
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  days: [{ type: String, required: true }],
  timezone: { type: String, default: 'America/New_York' },
  contactPhone: { type: String },
  parkingInfo: { type: String },
  photoUrl: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Index for quick lookup by day
MarketScheduleSchema.index({ days: 1, isActive: 1 });

export default mongoose.models.MarketSchedule || mongoose.model<IMarketSchedule>('MarketSchedule', MarketScheduleSchema);
