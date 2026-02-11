const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema({
  service: {
    type: String,
    enum: {
      values: ['gpt-vision', 'yolo', 'ensemble'],
      message: '{VALUE} is not a valid service',
    },
    required: [true, 'Service name is required'],
    index: true,
  },
  endpoint: {
    type: String,
    required: [true, 'Endpoint is required'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  inspectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inspection',
    default: null,
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  responseTime: {
    type: Number,
    required: [true, 'Response time is required'],
    min: 0,
  },
  status: {
    type: String,
    enum: {
      values: ['success', 'error'],
      message: '{VALUE} is not a valid status',
    },
    required: [true, 'Status is required'],
    index: true,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  tokenUsage: {
    type: Number,
    min: 0,
    default: null,
  },
  cost: {
    type: Number,
    min: 0,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
});

// Indexes for performance and querying (compound indexes only)
apiLogSchema.index({ service: 1, timestamp: -1 });
apiLogSchema.index({ userId: 1, timestamp: -1 });
apiLogSchema.index({ status: 1, timestamp: -1 });

// Static method to get total cost for a date range
apiLogSchema.statics.getTotalCost = async function (startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        cost: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        totalCalls: { $sum: 1 },
      },
    },
  ]);

  return result.length > 0 ? result[0] : { totalCost: 0, totalCalls: 0 };
};

// Static method to get API usage by service
apiLogSchema.statics.getUsageByService = async function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$service',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        totalCost: { $sum: '$cost' },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

module.exports = mongoose.model('ApiLog', apiLogSchema);
