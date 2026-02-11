const mongoose = require('mongoose');

const defectSchema = new mongoose.Schema({
  class: {
    type: String,
    required: [true, 'Defect class is required'],
    enum: {
      values: [
        'damaged_rivet',
        'missing_rivet',
        'filiform_corrosion',
        'missing_panel',
        'paint_detachment',
        'scratch',
        'composite_damage',
        'random_damage',
        'burn_mark',
        'scorch_mark',
        'metal_fatigue',
        'crack',
      ],
      message: '{VALUE} is not a valid defect class',
    },
  },
  confidence: {
    type: Number,
    required: [true, 'Confidence score is required'],
    min: [0, 'Confidence must be between 0 and 1'],
    max: [1, 'Confidence must be between 0 and 1'],
  },
  bbox: {
    x: {
      type: Number,
      required: [true, 'Bounding box x coordinate is required'],
      min: 0,
    },
    y: {
      type: Number,
      required: [true, 'Bounding box y coordinate is required'],
      min: 0,
    },
    width: {
      type: Number,
      required: [true, 'Bounding box width is required'],
      min: 0,
    },
    height: {
      type: Number,
      required: [true, 'Bounding box height is required'],
      min: 0,
    },
  },
  source: {
    type: String,
    enum: {
      values: ['yolo', 'gpt', 'ensemble'],
      message: '{VALUE} is not a valid source',
    },
    required: [true, 'Detection source is required'],
  },
}, { _id: false });

const inspectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
  },
  imageMetadata: {
    filename: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    format: {
      type: String,
      required: true,
    },
    dimensions: {
      width: {
        type: Number,
        required: true,
        min: 0,
      },
      height: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  status: {
    type: String,
    enum: {
      values: ['uploaded', 'processing', 'completed', 'failed'],
      message: '{VALUE} is not a valid status',
    },
    default: 'uploaded',
  },
  defects: [defectSchema],
  processingTime: {
    type: Number,
    min: 0,
    default: null,
  },
  modelVersion: {
    type: String,
    default: null,
  },
  aircraftId: {
    type: String,
    default: null,
  },
  notes: {
    type: String,
    default: '',
    maxlength: [1000, 'Notes must not exceed 1000 characters'],
  },
  errorMessage: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for performance
inspectionSchema.index({ userId: 1, createdAt: -1 });
inspectionSchema.index({ status: 1 });
inspectionSchema.index({ createdAt: -1 });
inspectionSchema.index({ aircraftId: 1, createdAt: -1 });

// Virtual for defect count
inspectionSchema.virtual('defectCount').get(function () {
  return this.defects ? this.defects.length : 0;
});

// Method to get defects by class
inspectionSchema.methods.getDefectsByClass = function (className) {
  return this.defects.filter(defect => defect.class === className);
};

// Method to get defects above confidence threshold
inspectionSchema.methods.getDefectsAboveThreshold = function (threshold = 0.5) {
  return this.defects.filter(defect => defect.confidence >= threshold);
};

module.exports = mongoose.model('Inspection', inspectionSchema);
