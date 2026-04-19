import mongoose from 'mongoose';

const QueuePositionSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderRef: {
    type: String,
    required: true,
    index: true
  },
  marketId: {
    type: String,
    required: true,
    index: true
  },
  marketName: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'queued', 'making', 'ready', 'picked_up', 'no_show', 'cancelled'],
    default: 'pending',
    index: true
  },
  customerInfo: {
    name: String,
    phone: String,
    email: String
  },
  items: [{
    name: String,
    quantity: Number,
    customizations: mongoose.Schema.Types.Mixed
  }],
  estimatedReadyAt: Date,
  paidAt: Date,
  queuedAt: Date,
  startedAt: Date,
  readyAt: Date,
  pickedUpAt: Date,
  noShowAt: Date,
  notes: String
}, {
  timestamps: true
});

// Compound indexes for efficient queries
QueuePositionSchema.index({ marketId: 1, status: 1, position: 1 });
QueuePositionSchema.index({ marketId: 1, createdAt: -1 });

// Static methods
QueuePositionSchema.statics.getNextPosition = async function(marketId) {
  const last = await this.findOne({ marketId })
    .sort({ position: -1 })
    .lean();
  return (last?.position || 0) + 1;
};

QueuePositionSchema.statics.getActiveQueue = async function(marketId) {
  return this.find({
    marketId,
    status: { $in: ['queued', 'making', 'ready'] }
  })
  .sort({ position: 1 })
  .lean();
};

QueuePositionSchema.statics.getPositionByOrderId = async function(orderId) {
  const entry = await this.findOne({ orderId }).lean();
  if (!entry) return null;
  
  // Calculate how many ahead
  const ahead = await this.countDocuments({
    marketId: entry.marketId,
    status: { $in: ['queued', 'making'] },
    position: { $lt: entry.position }
  });
  
  const makingNow = await this.find({
    marketId: entry.marketId,
    status: 'making'
  })
  .select('orderRef items')
  .lean();
  
  return {
    ...entry,
    ahead,
    makingNow,
    totalInQueue: await this.countDocuments({
      marketId: entry.marketId,
      status: { $in: ['queued', 'making'] }
    })
  };
};

// Pre-save middleware to update timestamps
QueuePositionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'queued':
        if (!this.queuedAt) this.queuedAt = now;
        break;
      case 'making':
        if (!this.startedAt) this.startedAt = now;
        break;
      case 'ready':
        if (!this.readyAt) this.readyAt = now;
        break;
      case 'picked_up':
        if (!this.pickedUpAt) this.pickedUpAt = now;
        break;
      case 'no_show':
        if (!this.noShowAt) this.noShowAt = now;
        break;
    }
  }
  next();
});

export const QueuePosition = mongoose.models.QueuePosition || 
  mongoose.model('QueuePosition', QueuePositionSchema);

export default QueuePosition;
