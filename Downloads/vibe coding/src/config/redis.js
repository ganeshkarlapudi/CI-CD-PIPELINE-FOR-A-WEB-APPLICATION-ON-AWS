const redis = require('redis');
const logger = require('./logger');

let redisClient = null;

// TTL constants (in seconds)
const TTL = {
  SESSION: 24 * 60 * 60, // 24 hours
  INSPECTION_RESULT: 60 * 60, // 1 hour
  MODEL_WEIGHTS: -1, // Persistent (no expiration)
};

// Redis key prefixes
const KEY_PREFIX = {
  SESSION: 'session:',
  BLACKLIST: 'blacklist:',
  INSPECTION: 'inspection:',
  MODEL_WEIGHTS: 'model:weights:',
};

/**
 * Connect to Redis server
 */
const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection attempts exceeded');
            return new Error('Redis reconnection failed');
          }
          // Exponential backoff: 50ms, 100ms, 200ms, etc.
          return Math.min(retries * 50, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis Client Reconnecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Error connecting to Redis:', error.message);
    logger.warn('Application will continue without Redis caching');
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is connected and available
 */
const isRedisAvailable = () => {
  return redisClient && redisClient.isOpen;
};

/**
 * Session Token Management
 */

/**
 * Store session token in Redis
 * @param {string} token - JWT token
 * @param {object} userData - User data to store with session
 * @returns {Promise<boolean>} Success status
 */
const storeSessionToken = async (token, userData) => {
  if (!isRedisAvailable()) {
    logger.warn('Redis not available, skipping session storage');
    return false;
  }

  try {
    const key = `${KEY_PREFIX.SESSION}${token}`;
    const value = JSON.stringify({
      userId: userData.userId,
      username: userData.username,
      role: userData.role,
      createdAt: new Date().toISOString(),
    });

    await redisClient.setEx(key, TTL.SESSION, value);
    logger.debug(`Session token stored for user: ${userData.username}`);
    return true;
  } catch (error) {
    logger.error('Error storing session token:', error);
    return false;
  }
};

/**
 * Get session data from Redis
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} Session data or null
 */
const getSessionToken = async (token) => {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const key = `${KEY_PREFIX.SESSION}${token}`;
    const value = await redisClient.get(key);

    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error('Error retrieving session token:', error);
    return null;
  }
};

/**
 * Delete session token from Redis
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} Success status
 */
const deleteSessionToken = async (token) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const key = `${KEY_PREFIX.SESSION}${token}`;
    await redisClient.del(key);
    logger.debug('Session token deleted');
    return true;
  } catch (error) {
    logger.error('Error deleting session token:', error);
    return false;
  }
};

/**
 * Token Blacklist Management (for logout)
 */

/**
 * Add token to blacklist
 * @param {string} token - JWT token to blacklist
 * @param {number} expiresIn - Token expiration time in seconds (default: 24 hours)
 * @returns {Promise<boolean>} Success status
 */
const blacklistToken = async (token, expiresIn = TTL.SESSION) => {
  if (!isRedisAvailable()) {
    logger.warn('Redis not available, skipping token blacklist');
    return false;
  }

  try {
    const key = `${KEY_PREFIX.BLACKLIST}${token}`;
    await redisClient.setEx(key, expiresIn, 'true');
    logger.debug('Token added to blacklist');
    return true;
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    return false;
  }
};

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} True if blacklisted
 */
const isTokenBlacklisted = async (token) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const key = `${KEY_PREFIX.BLACKLIST}${token}`;
    const value = await redisClient.get(key);
    return value !== null;
  } catch (error) {
    logger.error('Error checking token blacklist:', error);
    return false;
  }
};

/**
 * Inspection Results Caching
 */

/**
 * Cache inspection results
 * @param {string} inspectionId - Inspection ID
 * @param {object} inspectionData - Inspection data to cache
 * @returns {Promise<boolean>} Success status
 */
const cacheInspectionResult = async (inspectionId, inspectionData) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const key = `${KEY_PREFIX.INSPECTION}${inspectionId}`;
    const value = JSON.stringify(inspectionData);

    await redisClient.setEx(key, TTL.INSPECTION_RESULT, value);
    logger.debug(`Inspection result cached: ${inspectionId}`);
    return true;
  } catch (error) {
    logger.error('Error caching inspection result:', error);
    return false;
  }
};

/**
 * Get cached inspection result
 * @param {string} inspectionId - Inspection ID
 * @returns {Promise<object|null>} Cached inspection data or null
 */
const getCachedInspectionResult = async (inspectionId) => {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const key = `${KEY_PREFIX.INSPECTION}${inspectionId}`;
    const value = await redisClient.get(key);

    if (value) {
      logger.debug(`Cache hit for inspection: ${inspectionId}`);
      return JSON.parse(value);
    }

    logger.debug(`Cache miss for inspection: ${inspectionId}`);
    return null;
  } catch (error) {
    logger.error('Error retrieving cached inspection result:', error);
    return null;
  }
};

/**
 * Invalidate cached inspection result
 * @param {string} inspectionId - Inspection ID
 * @returns {Promise<boolean>} Success status
 */
const invalidateInspectionCache = async (inspectionId) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const key = `${KEY_PREFIX.INSPECTION}${inspectionId}`;
    await redisClient.del(key);
    logger.debug(`Inspection cache invalidated: ${inspectionId}`);
    return true;
  } catch (error) {
    logger.error('Error invalidating inspection cache:', error);
    return false;
  }
};

/**
 * Model Weights Reference Caching
 */

/**
 * Cache model weights reference
 * @param {string} modelVersion - Model version identifier
 * @param {object} weightsData - Model weights metadata (URL, path, etc.)
 * @returns {Promise<boolean>} Success status
 */
const cacheModelWeights = async (modelVersion, weightsData) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const key = `${KEY_PREFIX.MODEL_WEIGHTS}${modelVersion}`;
    const value = JSON.stringify({
      ...weightsData,
      cachedAt: new Date().toISOString(),
    });

    // Model weights are cached persistently (no expiration)
    await redisClient.set(key, value);
    logger.debug(`Model weights cached: ${modelVersion}`);
    return true;
  } catch (error) {
    logger.error('Error caching model weights:', error);
    return false;
  }
};

/**
 * Get cached model weights reference
 * @param {string} modelVersion - Model version identifier
 * @returns {Promise<object|null>} Cached model weights data or null
 */
const getCachedModelWeights = async (modelVersion) => {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const key = `${KEY_PREFIX.MODEL_WEIGHTS}${modelVersion}`;
    const value = await redisClient.get(key);

    if (value) {
      logger.debug(`Cache hit for model weights: ${modelVersion}`);
      return JSON.parse(value);
    }

    logger.debug(`Cache miss for model weights: ${modelVersion}`);
    return null;
  } catch (error) {
    logger.error('Error retrieving cached model weights:', error);
    return null;
  }
};

/**
 * Invalidate model weights cache
 * @param {string} modelVersion - Model version identifier
 * @returns {Promise<boolean>} Success status
 */
const invalidateModelWeightsCache = async (modelVersion) => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const key = `${KEY_PREFIX.MODEL_WEIGHTS}${modelVersion}`;
    await redisClient.del(key);
    logger.debug(`Model weights cache invalidated: ${modelVersion}`);
    return true;
  } catch (error) {
    logger.error('Error invalidating model weights cache:', error);
    return false;
  }
};

/**
 * Get all cached model versions
 * @returns {Promise<string[]>} Array of cached model versions
 */
const getCachedModelVersions = async () => {
  if (!isRedisAvailable()) {
    return [];
  }

  try {
    const pattern = `${KEY_PREFIX.MODEL_WEIGHTS}*`;
    const keys = await redisClient.keys(pattern);
    
    // Extract version from keys
    const versions = keys.map(key => key.replace(KEY_PREFIX.MODEL_WEIGHTS, ''));
    logger.debug(`Found ${versions.length} cached model versions`);
    return versions;
  } catch (error) {
    logger.error('Error retrieving cached model versions:', error);
    return [];
  }
};

/**
 * Utility Functions
 */

/**
 * Clear all cache entries (use with caution)
 * @returns {Promise<boolean>} Success status
 */
const clearAllCache = async () => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    await redisClient.flushDb();
    logger.warn('All Redis cache cleared');
    return true;
  } catch (error) {
    logger.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Get cache statistics
 * @returns {Promise<object>} Cache statistics
 */
const getCacheStats = async () => {
  if (!isRedisAvailable()) {
    return {
      available: false,
      message: 'Redis not available',
    };
  }

  try {
    const info = await redisClient.info('stats');
    const dbSize = await redisClient.dbSize();

    return {
      available: true,
      connected: redisClient.isOpen,
      dbSize,
      info: info,
    };
  } catch (error) {
    logger.error('Error retrieving cache stats:', error);
    return {
      available: false,
      error: error.message,
    };
  }
};

/**
 * Gracefully disconnect from Redis
 */
const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis client disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }
};

module.exports = {
  // Connection management
  connectRedis,
  getRedisClient,
  isRedisAvailable,
  disconnectRedis,

  // Session management
  storeSessionToken,
  getSessionToken,
  deleteSessionToken,

  // Token blacklist
  blacklistToken,
  isTokenBlacklisted,

  // Inspection caching
  cacheInspectionResult,
  getCachedInspectionResult,
  invalidateInspectionCache,

  // Model weights caching
  cacheModelWeights,
  getCachedModelWeights,
  invalidateModelWeightsCache,
  getCachedModelVersions,

  // Utilities
  clearAllCache,
  getCacheStats,

  // Constants (exported for testing)
  TTL,
  KEY_PREFIX,
};
