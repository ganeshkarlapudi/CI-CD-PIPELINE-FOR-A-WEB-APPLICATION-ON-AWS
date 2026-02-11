const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Model = require('../models/Model');
const TrainingJob = require('../models/TrainingJob');
const Inspection = require('../models/Inspection');
const ApiLog = require('../models/ApiLog');
const SystemLog = require('../models/SystemLog');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateObjectId,
  paginationValidation,
  dateRangeValidation,
  userManagementValidation,
  searchValidation,
} = require('../middleware/validation');
const { uploadFile } = require('../config/storage');
const upload = require('../config/multer');
const { 
  cacheModelWeights, 
  getCachedModelWeights, 
  invalidateModelWeightsCache 
} = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();

// Apply authentication and admin authorization to all admin routes
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/users - Get all users with pagination and search
router.get('/users', paginationValidation, searchValidation, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query filter
    const filter = {};

    // Search by username or email
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by role
    if (role && ['user', 'admin'].includes(role)) {
      filter.role = role;
    }

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Fetch users with pagination
    const users = await User.find(filter)
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const pages = Math.ceil(total / limitNum);

    logger.info(`Admin ${req.user.username} fetched users list`);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: pageNum,
        pages,
        limit: limitNum,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching users:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USERS_FAILED',
        message: 'Failed to fetch users',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', userManagementValidation, async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username, email, and password are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Role must be either "user" or "admin"',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate username length
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be between 3 and 30 characters',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate email format
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username is already registered',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email is already registered',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      status: 'active',
    });

    await newUser.save();

    logger.info(`Admin ${req.user.username} created new user: ${username} with role: ${role}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId: newUser._id,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating user:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_USER_FAILED',
        message: 'Failed to create user',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/admin/users/:id - Update user role/status
router.put('/users/:id', validateObjectId('id'), userManagementValidation, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, status } = req.body;

    // Validate user ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'Invalid user ID format',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Prevent admin from modifying their own role or status
    if (user._id.toString() === req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SELF_MODIFICATION_FORBIDDEN',
          message: 'Cannot modify your own role or status',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Build update object
    const updates = {};

    // Validate and update email if provided
    if (email !== undefined) {
      const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email format',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Check if email is already taken by another user
      const existingEmail = await User.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email is already registered to another user',
          },
          timestamp: new Date().toISOString(),
        });
      }

      updates.email = email;
    }

    // Validate and update role if provided
    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Role must be either "user" or "admin"',
          },
          timestamp: new Date().toISOString(),
        });
      }
      updates.role = role;
    }

    // Validate and update status if provided
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Status must be either "active" or "inactive"',
          },
          timestamp: new Date().toISOString(),
        });
      }
      updates.status = status;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    logger.info(`Admin ${req.user.username} updated user ${user.username}: ${JSON.stringify(updates)}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating user:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_USER_FAILED',
        message: 'Failed to update user',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/admin/users/:id - Deactivate user
router.delete('/users/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'Invalid user ID format',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SELF_DEACTIVATION_FORBIDDEN',
          message: 'Cannot deactivate your own account',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Deactivate user (set status to inactive)
    user.status = 'inactive';
    await user.save();

    logger.info(`Admin ${req.user.username} deactivated user: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deactivating user:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'DEACTIVATE_USER_FAILED',
        message: 'Failed to deactivate user',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// MODEL MANAGEMENT ENDPOINTS
// ============================================

/**
 * @route   GET /api/admin/models
 * @desc    Get all models with version, mAP, status, and deployment info
 * @access  Admin only
 */
router.get('/models', async (req, res) => {
  try {
    // Fetch all models sorted by createdAt descending
    const models = await Model.find()
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    logger.info(`Admin ${req.user.username} fetched models list`);

    res.status(200).json({
      success: true,
      data: {
        models: models.map(model => ({
          id: model._id,
          version: model.version,
          type: model.type,
          status: model.status,
          mAP: model.metrics?.mAP || null,
          precision: model.metrics?.precision || null,
          recall: model.metrics?.recall || null,
          f1Score: model.metrics?.f1Score || null,
          weightsUrl: model.weightsUrl,
          createdAt: model.createdAt,
          deployedAt: model.deployedAt,
          createdBy: model.createdBy,
        })),
        total: models.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching models:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_MODELS_FAILED',
        message: 'Failed to fetch models',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   POST /api/admin/models/train
 * @desc    Upload training dataset and create training job
 * @access  Admin only
 */
router.post('/models/train', upload.fields([
  { name: 'images', maxCount: 1000 },
  { name: 'labels', maxCount: 1000 }
]), async (req, res) => {
  try {
    // Validate files were uploaded
    if (!req.files || !req.files.images || req.files.images.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_IMAGES',
          message: 'No training images were uploaded',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.files.labels || req.files.labels.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_LABELS',
          message: 'No label files were uploaded',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const images = req.files.images;
    const labels = req.files.labels;

    // Validate that number of images matches number of labels
    if (images.length !== labels.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISMATCH_COUNT',
          message: `Number of images (${images.length}) must match number of labels (${labels.length})`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Extract training configuration from request body
    const {
      modelVersion,
      epochs = 100,
      batchSize = 16,
      learningRate = 0.001,
      imageSize = 640,
      trainSplit = 0.8,
    } = req.body;

    // Validate model version
    if (!modelVersion) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_VERSION',
          message: 'Model version is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if model version already exists
    const existingModel = await Model.findOne({ version: modelVersion });
    if (existingModel) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VERSION_EXISTS',
          message: `Model version "${modelVersion}" already exists`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate label files contain proper defect classes
    const validDefectClasses = [
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
    ];

    const detectedClasses = new Set();
    let validationErrors = [];

    // Parse label files to extract classes
    for (let i = 0; i < labels.length; i++) {
      const labelFile = labels[i];
      const labelContent = labelFile.buffer.toString('utf-8');
      const lines = labelContent.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const classIndex = parseInt(parts[0], 10);
          
          // Validate class index is within valid range
          if (classIndex < 0 || classIndex >= validDefectClasses.length) {
            validationErrors.push({
              file: labelFile.originalname,
              error: `Invalid class index: ${classIndex}`,
            });
          } else {
            detectedClasses.add(validDefectClasses[classIndex]);
          }
        }
      }
    }

    // Check for validation errors
    if (validationErrors.length > 0) {
      logger.warn(`Label validation errors: ${JSON.stringify(validationErrors)}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LABELS',
          message: 'Some label files contain invalid class indices',
          details: validationErrors.slice(0, 10), // Return first 10 errors
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Generate unique job ID
    const jobId = uuidv4();

    // Upload training data to storage
    logger.info(`Uploading ${images.length} training images and labels for job ${jobId}`);

    const datasetFolder = `training-datasets/${jobId}`;
    const uploadedFiles = {
      images: [],
      labels: [],
    };

    // Upload images
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const filename = `${datasetFolder}/images/${image.originalname}`;
      const imageUrl = await uploadFile(image.buffer, filename, image.mimetype);
      uploadedFiles.images.push(imageUrl);
    }

    // Upload labels
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const filename = `${datasetFolder}/labels/${label.originalname}`;
      const labelUrl = await uploadFile(label.buffer, filename, 'text/plain');
      uploadedFiles.labels.push(labelUrl);
    }

    // Calculate train/val split
    const totalImages = images.length;
    const trainImages = Math.floor(totalImages * trainSplit);
    const valImages = totalImages - trainImages;

    // Create training job record
    const trainingJob = new TrainingJob({
      jobId,
      modelVersion,
      status: 'pending',
      progress: 0,
      datasetInfo: {
        totalImages,
        trainImages,
        valImages,
        classes: Array.from(detectedClasses),
        datasetUrl: `${datasetFolder}`,
      },
      trainingConfig: {
        epochs: parseInt(epochs, 10),
        batchSize: parseInt(batchSize, 10),
        learningRate: parseFloat(learningRate),
        imageSize: parseInt(imageSize, 10),
      },
      createdBy: req.user.userId,
    });

    await trainingJob.save();

    logger.info(`Admin ${req.user.username} created training job ${jobId} for model ${modelVersion}`);

    res.status(201).json({
      success: true,
      data: {
        jobId,
        modelVersion,
        status: 'pending',
        datasetInfo: {
          totalImages,
          trainImages,
          valImages,
          classes: Array.from(detectedClasses),
        },
        message: 'Training dataset uploaded successfully. Training job created.',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error creating training job:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'TRAINING_JOB_FAILED',
        message: 'Failed to create training job',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/admin/models/train/:jobId
 * @desc    Get training job status and progress
 * @access  Admin only
 */
router.get('/models/train/:jobId', validateObjectId('jobId'), async (req, res) => {
  try {
    const { jobId } = req.params;

    // Find training job
    const trainingJob = await TrainingJob.findOne({ jobId });

    if (!trainingJob) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Training job not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Admin ${req.user.username} fetched training job status: ${jobId}`);

    res.status(200).json({
      success: true,
      data: {
        jobId: trainingJob.jobId,
        modelVersion: trainingJob.modelVersion,
        status: trainingJob.status,
        progress: trainingJob.progress,
        metrics: {
          loss: trainingJob.metrics?.loss || null,
          mAP: trainingJob.metrics?.mAP || null,
          precision: trainingJob.metrics?.precision || null,
          recall: trainingJob.metrics?.recall || null,
        },
        datasetInfo: trainingJob.datasetInfo,
        trainingConfig: trainingJob.trainingConfig,
        errorMessage: trainingJob.errorMessage,
        startedAt: trainingJob.startedAt,
        completedAt: trainingJob.completedAt,
        createdAt: trainingJob.createdAt,
        updatedAt: trainingJob.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error fetching training job status:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_JOB_FAILED',
        message: 'Failed to fetch training job status',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   POST /api/admin/models/:version/deploy
 * @desc    Deploy a model version to production
 * @access  Admin only
 */
router.post('/models/:version/deploy', async (req, res) => {
  try {
    const { version } = req.params;

    // Find model by version
    const model = await Model.findOne({ version });

    if (!model) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: `Model version "${version}" not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate model mAP is at least 95% (0.95)
    if (!model.metrics || !model.metrics.mAP || model.metrics.mAP < 0.95) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_MAP',
          message: `Model mAP (${model.metrics?.mAP ? (model.metrics.mAP * 100).toFixed(2) + '%' : 'N/A'}) is below the required 95% threshold for deployment`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if model is already deployed
    if (model.status === 'deployed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_DEPLOYED',
          message: `Model version "${version}" is already deployed`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Archive all currently deployed models
    await Model.archiveDeployed();
    logger.info(`Archived previously deployed models`);

    // Update model status to deployed
    model.status = 'deployed';
    model.deployedAt = new Date();
    await model.save();

    // Cache model weights reference in Redis (persistent)
    await cacheModelWeights(model.version, {
      version: model.version,
      weightsUrl: model.weightsUrl,
      mAP: model.metrics.mAP,
      status: model.status,
      deployedAt: model.deployedAt,
    });

    logger.info(`Admin ${req.user.username} deployed model version ${version}`);

    // Notify ML service to use new model weights (optional - can be implemented later)
    // This would typically involve calling the ML service API to reload the model
    const axios = require('axios');
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    
    try {
      // Attempt to notify ML service about model update
      await axios.post(`${mlServiceUrl}/ml/reload-model`, {
        version: model.version,
        weightsUrl: model.weightsUrl,
      }, {
        timeout: 10000, // 10 second timeout
      });
      logger.info(`ML service notified about model deployment: ${version}`);
    } catch (mlError) {
      // Log warning but don't fail the deployment
      logger.warn(`Failed to notify ML service about model deployment: ${mlError.message}`);
    }

    res.status(200).json({
      success: true,
      data: {
        version: model.version,
        status: model.status,
        mAP: model.metrics.mAP,
        deployedAt: model.deployedAt,
        message: `Model version "${version}" deployed successfully`,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error deploying model:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'DEPLOYMENT_FAILED',
        message: 'Failed to deploy model',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// MONITORING ENDPOINTS
// ============================================

/**
 * @route   GET /api/admin/monitoring/metrics
 * @desc    Get system metrics including inspections, API usage, costs, and errors
 * @access  Admin only
 */
router.get('/monitoring/metrics', dateRangeValidation, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Set default date range (last 30 days if not provided)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Start date must be before end date',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Aggregate data from multiple collections in parallel
    const [
      totalInspections,
      completedInspections,
      avgProcessingTimeResult,
      apiCostData,
      apiUsageByService,
      errorCountByLevel,
      activeUsersCount,
    ] = await Promise.all([
      // Total inspections in date range
      Inspection.countDocuments({
        createdAt: { $gte: start, $lte: end },
      }),

      // Completed inspections count
      Inspection.countDocuments({
        createdAt: { $gte: start, $lte: end },
        status: 'completed',
      }),

      // Average processing time for completed inspections
      Inspection.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: 'completed',
            processingTime: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' },
            minProcessingTime: { $min: '$processingTime' },
            maxProcessingTime: { $max: '$processingTime' },
          },
        },
      ]),

      // Total API costs
      ApiLog.getTotalCost(start, end),

      // API usage by service
      ApiLog.getUsageByService(start, end),

      // Error count by level
      SystemLog.getErrorCountByLevel(start, end),

      // Active users count (users who logged in during the period)
      User.countDocuments({
        lastLogin: { $gte: start, $lte: end },
        status: 'active',
      }),
    ]);

    // Calculate average processing time
    const avgProcessingTime = avgProcessingTimeResult.length > 0
      ? Math.round(avgProcessingTimeResult[0].avgProcessingTime)
      : 0;

    const minProcessingTime = avgProcessingTimeResult.length > 0
      ? Math.round(avgProcessingTimeResult[0].minProcessingTime)
      : 0;

    const maxProcessingTime = avgProcessingTimeResult.length > 0
      ? Math.round(avgProcessingTimeResult[0].maxProcessingTime)
      : 0;

    // Format API usage data
    const apiUsage = {
      total: apiUsageByService.reduce((sum, service) => sum + service.count, 0),
      byService: apiUsageByService.map(service => ({
        service: service._id,
        calls: service.count,
        avgResponseTime: Math.round(service.avgResponseTime),
        totalCost: service.totalCost || 0,
        errorCount: service.errorCount,
        successRate: ((service.count - service.errorCount) / service.count * 100).toFixed(2) + '%',
      })),
    };

    // Format error data
    const errorData = {
      total: errorCountByLevel.reduce((sum, level) => sum + level.count, 0),
      byLevel: errorCountByLevel.reduce((acc, level) => {
        acc[level._id] = level.count;
        return acc;
      }, {}),
    };

    // Calculate GPT Vision specific metrics
    const gptVisionData = apiUsageByService.find(s => s._id === 'gpt-vision');
    const gptVisionMetrics = gptVisionData ? {
      calls: gptVisionData.count,
      totalCost: gptVisionData.totalCost || 0,
      avgCostPerCall: gptVisionData.count > 0 
        ? ((gptVisionData.totalCost || 0) / gptVisionData.count).toFixed(4)
        : 0,
    } : {
      calls: 0,
      totalCost: 0,
      avgCostPerCall: 0,
    };

    logger.info(`Admin ${req.user.username} fetched monitoring metrics for ${start.toISOString()} to ${end.toISOString()}`);

    res.status(200).json({
      success: true,
      data: {
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        inspections: {
          total: totalInspections,
          completed: completedInspections,
          failed: totalInspections - completedInspections,
          completionRate: totalInspections > 0 
            ? ((completedInspections / totalInspections) * 100).toFixed(2) + '%'
            : '0%',
        },
        performance: {
          avgProcessingTime: avgProcessingTime,
          minProcessingTime: minProcessingTime,
          maxProcessingTime: maxProcessingTime,
          unit: 'milliseconds',
        },
        apiUsage: apiUsage,
        apiCosts: {
          total: apiCostData.totalCost || 0,
          totalCalls: apiCostData.totalCalls || 0,
          gptVision: gptVisionMetrics,
        },
        errors: errorData,
        users: {
          active: activeUsersCount,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error fetching monitoring metrics:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_METRICS_FAILED',
        message: 'Failed to fetch monitoring metrics',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/admin/monitoring/logs
 * @desc    Get system logs with pagination and filtering
 * @access  Admin only
 */
router.get('/monitoring/logs', paginationValidation, dateRangeValidation, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      severity = '',
      startDate = '',
      endDate = '',
      component = '',
      resolved = '',
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Page must be >= 1 and limit must be between 1 and 100',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Build query filter
    const filter = {};

    // Filter by severity level
    if (severity) {
      const validLevels = ['info', 'warning', 'error', 'critical'];
      const severityLevels = severity.split(',').map(s => s.trim().toLowerCase());
      
      // Validate all severity levels
      const invalidLevels = severityLevels.filter(level => !validLevels.includes(level));
      if (invalidLevels.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SEVERITY',
            message: `Invalid severity level(s): ${invalidLevels.join(', ')}. Valid levels are: ${validLevels.join(', ')}`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      filter.level = severityLevels.length === 1 ? severityLevels[0] : { $in: severityLevels };
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.timestamp = {};

      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_START_DATE',
              message: 'Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)',
            },
            timestamp: new Date().toISOString(),
          });
        }
        filter.timestamp.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_END_DATE',
              message: 'Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)',
            },
            timestamp: new Date().toISOString(),
          });
        }
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }

      // Validate date range
      if (filter.timestamp.$gte && filter.timestamp.$lte && filter.timestamp.$gte > filter.timestamp.$lte) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before end date',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Filter by component
    if (component) {
      filter.component = { $regex: component, $options: 'i' };
    }

    // Filter by resolved status
    if (resolved !== '') {
      if (resolved === 'true' || resolved === '1') {
        filter.resolved = true;
      } else if (resolved === 'false' || resolved === '0') {
        filter.resolved = false;
      }
    }

    // Get total count for pagination
    const total = await SystemLog.countDocuments(filter);

    // Fetch logs with pagination, sorted by timestamp descending
    const logs = await SystemLog.find(filter)
      .populate('userId', 'username email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const pages = Math.ceil(total / limitNum);

    // Format logs for response
    const formattedLogs = logs.map(log => ({
      id: log._id,
      level: log.level,
      component: log.component,
      message: log.message,
      details: log.details,
      user: log.userId ? {
        id: log.userId._id,
        username: log.userId.username,
        email: log.userId.email,
      } : null,
      timestamp: log.timestamp,
      resolved: log.resolved,
    }));

    logger.info(`Admin ${req.user.username} fetched system logs (page ${pageNum}, filters: ${JSON.stringify(filter)})`);

    res.status(200).json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total,
          page: pageNum,
          pages,
          limit: limitNum,
          hasNext: pageNum < pages,
          hasPrev: pageNum > 1,
        },
        filters: {
          severity: severity || 'all',
          startDate: startDate || null,
          endDate: endDate || null,
          component: component || null,
          resolved: resolved !== '' ? (resolved === 'true' || resolved === '1') : null,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error fetching system logs:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_LOGS_FAILED',
        message: 'Failed to fetch system logs',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/admin/monitoring/cache-stats
 * @desc    Get Redis cache statistics
 * @access  Admin only
 */
router.get('/monitoring/cache-stats', async (req, res) => {
  try {
    const { getCacheStats, getCachedModelVersions } = require('../config/redis');
    
    // Get general cache statistics
    const cacheStats = await getCacheStats();
    
    // Get cached model versions
    const cachedModels = await getCachedModelVersions();

    res.status(200).json({
      success: true,
      data: {
        redis: cacheStats,
        cachedModels: {
          count: cachedModels.length,
          versions: cachedModels,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error fetching cache statistics:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CACHE_STATS_FAILED',
        message: 'Failed to fetch cache statistics',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   POST /api/admin/monitoring/logs/client
 * @desc    Log frontend errors to the system
 * @access  Authenticated users (not admin-only)
 */
router.post('/monitoring/logs/client', authenticate, async (req, res) => {
  try {
    const { level, component, message, details } = req.body;

    // Validate required fields
    if (!level || !component || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Level, component, and message are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate log level
    const validLevels = ['info', 'warning', 'error', 'critical'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LEVEL',
          message: `Invalid log level. Valid levels are: ${validLevels.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Create system log entry
    await SystemLog.create({
      level,
      component,
      message,
      details: details || {},
      userId: req.user.userId,
    });

    // Also log to Winston for immediate visibility
    logger[level === 'critical' ? 'error' : level](`Frontend error: ${message}`, {
      component,
      userId: req.user.userId,
      details,
    });

    res.status(201).json({
      success: true,
      message: 'Error logged successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error logging client error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'LOG_CLIENT_ERROR_FAILED',
        message: 'Failed to log client error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
