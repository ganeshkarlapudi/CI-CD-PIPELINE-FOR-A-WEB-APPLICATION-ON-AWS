const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: {
      values: ['info', 'warning', 'error', 'critical'],
      message: '{VALUE} is not a valid log level',
    },
    required: [true, 'Log level is required'],
    index: true,
  },
  component: {
    type: String,
    required: [true, 'Component name is required'],
    index: true,
  },
  message: {
    type: String,
    required: [true, 'Log message is required'],
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: false,
});

// Indexes for performance and querying
systemLogSchema.index({ level: 1, timestamp: -1 });
systemLogSchema.index({ component: 1, timestamp: -1 });
systemLogSchema.index({ timestamp: -1 });
systemLogSchema.index({ resolved: 1, level: 1 });

// Static method to get error count by level
systemLogSchema.statics.getErrorCountByLevel = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Static method to get unresolved critical errors
systemLogSchema.statics.getUnresolvedCritical = function() {
  return this.find({
    level: { $in: ['error', 'critical'] },
    resolved: false,
  }).sort({ timestamp: -1 });
};

// Static method to mark errors as resolved
systemLogSchema.statics.markResolved = async function(logIds) {
  return this.updateMany(
    { _id: { $in: logIds } },
    { $set: { resolved: true } }
  );
};

// Static method to get logs by component
systemLogSchema.statics.getByComponent = function(component, limit = 100) {
  return this.find({ component })
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('SystemLog', systemLogSchema);
