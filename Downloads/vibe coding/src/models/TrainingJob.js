const mongoose = require('mongoose');

const trainingJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
  },
  modelVersion: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'training', 'validating', 'completed', 'failed'],
    default: 'pending',
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  datasetInfo: {
    totalImages: {
      type: Number,
      default: 0,
    },
    trainImages: {
      type: Number,
      default: 0,
    },
    valImages: {
      type: Number,
      default: 0,
    },
    classes: [{
      type: String,
    }],
    datasetUrl: {
      type: String,
    },
  },
  metrics: {
    loss: {
      type: Number,
      default: null,
    },
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
  },
  trainingConfig: {
    epochs: {
      type: Number,
      default: 100,
    },
    batchSize: {
      type: Number,
      default: 16,
    },
    learningRate: {
      type: Number,
      default: 0.001,
    },
    imageSize: {
      type: Number,
      default: 640,
    },
  },
  errorMessage: {
    type: String,
    default: null,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes for performance
trainingJobSchema.index({ status: 1 });
trainingJobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TrainingJob', trainingJobSchema);
