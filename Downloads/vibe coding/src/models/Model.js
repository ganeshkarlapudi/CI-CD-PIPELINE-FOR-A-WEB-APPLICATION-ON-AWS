const mongoose = require('mongoose');

const classMetricSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true,
  },
  ap: {
    type: Number,
    min: 0,
    max: 1,
  },
  precision: {
    type: Number,
    min: 0,
    max: 1,
  },
  recall: {
    type: Number,
    min: 0,
    max: 1,
  },
}, { _id: false });

const modelSchema = new mongoose.Schema({
  version: {
    type: String,
    required: [true, 'Model version is required'],
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    enum: {
      values: ['yolov8', 'ensemble'],
      message: '{VALUE} is not a valid model type',
    },
    required: [true, 'Model type is required'],
  },
  status: {
    type: String,
    enum: {
      values: ['training', 'validating', 'deployed', 'archived'],
      message: '{VALUE} is not a valid status',
    },
    default: 'training',
  },
  metrics: {
    mAP: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    precision: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    recall: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    f1Score: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    classMetrics: [classMetricSchema],
  },
  trainingConfig: {
    epochs: {
      type: Number,
      min: 1,
      default: null,
    },
    batchSize: {
      type: Number,
      min: 1,
      default: null,
    },
    learningRate: {
      type: Number,
      min: 0,
      default: null,
    },
    imageSize: {
      type: Number,
      min: 1,
      default: 640,
    },
    augmentation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  datasetInfo: {
    totalImages: {
      type: Number,
      min: 0,
      default: null,
    },
    trainSplit: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    valSplit: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    classes: [{
      type: String,
    }],
  },
  weightsUrl: {
    type: String,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  deployedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for performance
modelSchema.index({ status: 1 });
modelSchema.index({ createdAt: -1 });
modelSchema.index({ 'metrics.mAP': -1 });

// Virtual to check if model meets deployment criteria
modelSchema.virtual('isDeployable').get(function () {
  return this.metrics && this.metrics.mAP >= 0.95;
});

// Method to archive current deployed model before deploying new one
modelSchema.statics.archiveDeployed = async function () {
  return this.updateMany(
    { status: 'deployed' },
    { $set: { status: 'archived' } }
  );
};

// Method to get latest deployed model
modelSchema.statics.getDeployed = function () {
  return this.findOne({ status: 'deployed' }).sort({ deployedAt: -1 });
};

module.exports = mongoose.model('Model', modelSchema);
