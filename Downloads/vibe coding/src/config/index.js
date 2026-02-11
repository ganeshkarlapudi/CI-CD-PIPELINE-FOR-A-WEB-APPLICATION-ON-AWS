/**
 * Centralized Configuration Module
 * 
 * This module loads and validates all environment variables,
 * providing a single source of truth for application configuration.
 */

const path = require('path');

/**
 * Parse boolean environment variable
 * @param {string} value - Environment variable value
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean}
 */
const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
};

/**
 * Parse integer environment variable
 * @param {string} value - Environment variable value
 * @param {number} defaultValue - Default value if not set
 * @returns {number}
 */
const parseInt = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse float environment variable
 * @param {string} value - Environment variable value
 * @param {number} defaultValue - Default value if not set
 * @returns {number}
 */
const parseFloat = (value, defaultValue) => {
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Application Configuration
 */
const config = {
  // Application
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 3000),
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },

  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aircraft_detection',
    poolSize: parseInt(process.env.MONGO_POOL_SIZE, 100),
    connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10000),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT, 10000),
    logging: parseBoolean(process.env.DB_LOGGING, false),
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    sessionTTL: parseInt(process.env.REDIS_SESSION_TTL, 86400),
    modelCacheTTL: parseInt(process.env.REDIS_MODEL_CACHE_TTL, 0),
    inspectionCacheTTL: parseInt(process.env.REDIS_INSPECTION_CACHE_TTL, 3600),
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_here_change_in_production',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 5),
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES, 15),
  },

  // Storage
  storage: {
    useLocalStorage: parseBoolean(process.env.USE_LOCAL_STORAGE, true),
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    aws: {
      s3Bucket: process.env.AWS_S3_BUCKET,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      signedUrlExpiration: parseInt(process.env.S3_SIGNED_URL_EXPIRATION, 3600),
    },
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    gptVisionModel: process.env.GPT_VISION_MODEL || 'gpt-4-vision-preview',
    maxTokens: parseInt(process.env.GPT_VISION_MAX_TOKENS, 1000),
    temperature: parseFloat(process.env.GPT_VISION_TEMPERATURE, 0.2),
    monthlyBudget: parseInt(process.env.OPENAI_MONTHLY_BUDGET, 100),
    alertThreshold: parseInt(process.env.OPENAI_ALERT_THRESHOLD, 80),
  },

  // ML Service
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:5000',
    port: parseInt(process.env.ML_SERVICE_PORT, 5000),
    timeout: parseInt(process.env.ML_SERVICE_TIMEOUT, 30000),
    flaskEnv: process.env.FLASK_ENV || 'development',
    mockService: parseBoolean(process.env.MOCK_ML_SERVICE, false),
  },

  // YOLO Configuration
  yolo: {
    modelPath: process.env.YOLO_MODEL_PATH || './ml-service/models/yolov8n.pt',
    confidenceThreshold: parseFloat(process.env.YOLO_CONFIDENCE_THRESHOLD, 0.5),
    nmsIouThreshold: parseFloat(process.env.YOLO_NMS_IOU_THRESHOLD, 0.45),
    imageSize: parseInt(process.env.YOLO_IMAGE_SIZE, 640),
    device: process.env.YOLO_DEVICE || 'cpu',
  },

  // Ensemble Configuration
  ensemble: {
    yoloWeight: parseFloat(process.env.ENSEMBLE_YOLO_WEIGHT, 0.6),
    gptWeight: parseFloat(process.env.ENSEMBLE_GPT_WEIGHT, 0.4),
    nmsIouThreshold: parseFloat(process.env.NMS_IOU_THRESHOLD, 0.5),
    minConfidence: parseFloat(process.env.ENSEMBLE_MIN_CONFIDENCE, 0.5),
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 52428800), // 50MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/tiff').split(','),
    minImageDimension: parseInt(process.env.MIN_IMAGE_DIMENSION, 640),
    maxImageDimension: parseInt(process.env.MAX_IMAGE_DIMENSION, 4096),
    maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD, 10),
  },

  // Security
  security: {
    cors: {
      allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      allowCredentials: parseBoolean(process.env.CORS_ALLOW_CREDENTIALS, true),
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    },
    authRateLimit: {
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 900000),
      maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10),
    },
    uploadRateLimit: {
      windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS, 60000),
      maxRequests: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS, 20),
    },
    helmetEnabled: parseBoolean(process.env.HELMET_ENABLED, true),
    cspEnabled: parseBoolean(process.env.CSP_ENABLED, false),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
    errorLogFile: process.env.ERROR_LOG_FILE || './logs/error.log',
    combinedLogFile: process.env.COMBINED_LOG_FILE || './logs/combined.log',
    warningsLogFile: process.env.WARNINGS_LOG_FILE || './logs/warnings.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    consoleEnabled: parseBoolean(process.env.LOG_CONSOLE_ENABLED, true),
    consoleColorize: parseBoolean(process.env.LOG_CONSOLE_COLORIZE, true),
  },

  // Monitoring
  monitoring: {
    performanceMonitoring: parseBoolean(process.env.PERFORMANCE_MONITORING, true),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT, 30000),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL, 30000),
  },

  // Email (Optional)
  email: {
    enabled: parseBoolean(process.env.EMAIL_ENABLED, false),
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 587),
    secure: parseBoolean(process.env.EMAIL_SECURE, false),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@aircraft-detection.com',
  },

  // Defect Classes
  defectClasses: (process.env.DEFECT_CLASSES || 
    'damaged_rivet,missing_rivet,filiform_corrosion,missing_panel,paint_detachment,scratch,composite_damage,random_damage,burn_mark,scorch_mark,metal_fatigue,crack'
  ).split(','),

  // Development & Debugging
  debug: {
    enabled: parseBoolean(process.env.DEBUG, false),
    apiLogging: parseBoolean(process.env.API_LOGGING, true),
    seedDatabase: parseBoolean(process.env.SEED_DATABASE, false),
  },
};

/**
 * Validate required configuration
 */
const validateConfig = () => {
  const errors = [];

  // Check required variables
  if (!config.database.uri) {
    errors.push('MONGODB_URI is required');
  }

  if (!config.auth.jwtSecret || config.auth.jwtSecret === 'your_jwt_secret_key_here_change_in_production') {
    if (config.app.isProduction) {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
  }

  if (!config.openai.apiKey && !config.mlService.mockService) {
    errors.push('OPENAI_API_KEY is required (or set MOCK_ML_SERVICE=true for testing)');
  }

  if (!config.storage.useLocalStorage) {
    if (!config.storage.aws.s3Bucket) {
      errors.push('AWS_S3_BUCKET is required when USE_LOCAL_STORAGE=false');
    }
    if (!config.storage.aws.accessKeyId) {
      errors.push('AWS_ACCESS_KEY_ID is required when USE_LOCAL_STORAGE=false');
    }
    if (!config.storage.aws.secretAccessKey) {
      errors.push('AWS_SECRET_ACCESS_KEY is required when USE_LOCAL_STORAGE=false');
    }
  }

  // Validate ensemble weights sum to 1.0
  const weightSum = config.ensemble.yoloWeight + config.ensemble.gptWeight;
  if (Math.abs(weightSum - 1.0) > 0.01) {
    errors.push(`Ensemble weights must sum to 1.0 (current: ${weightSum})`);
  }

  // Production-specific validations
  if (config.app.isProduction) {
    if (config.auth.sessionSecret === 'your_session_secret_here_change_in_production') {
      errors.push('SESSION_SECRET must be set to a secure value in production');
    }

    if (config.security.cors.allowedOrigins.includes('*')) {
      errors.push('CORS_ALLOWED_ORIGINS should not include "*" in production');
    }

    if (config.auth.bcryptSaltRounds < 10) {
      errors.push('BCRYPT_SALT_ROUNDS should be at least 10 in production');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (config.app.isProduction) {
      throw new Error('Configuration validation failed. Please fix the errors above.');
    } else {
      console.warn('⚠️  Configuration warnings detected. Application will continue but may not work correctly.');
    }
  }
};

// Validate configuration on load
validateConfig();

/**
 * Get configuration value by path
 * @param {string} path - Dot-notation path (e.g., 'app.port')
 * @returns {any} Configuration value
 */
const get = (path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], config);
};

/**
 * Check if running in development mode
 * @returns {boolean}
 */
const isDevelopment = () => config.app.isDevelopment;

/**
 * Check if running in production mode
 * @returns {boolean}
 */
const isProduction = () => config.app.isProduction;

/**
 * Check if running in test mode
 * @returns {boolean}
 */
const isTest = () => config.app.isTest;

module.exports = {
  ...config,
  get,
  isDevelopment,
  isProduction,
  isTest,
  validateConfig,
};
