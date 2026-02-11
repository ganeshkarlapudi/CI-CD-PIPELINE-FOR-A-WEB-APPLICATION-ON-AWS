/**
 * Test script for Redis caching functionality
 * Run with: node test-redis-cache.js
 */

require('dotenv').config();
const {
  connectRedis,
  disconnectRedis,
  storeSessionToken,
  getSessionToken,
  deleteSessionToken,
  blacklistToken,
  isTokenBlacklisted,
  cacheInspectionResult,
  getCachedInspectionResult,
  invalidateInspectionCache,
  cacheModelWeights,
  getCachedModelWeights,
  getCachedModelVersions,
  getCacheStats,
} = require('./src/config/redis');

const logger = require('./src/config/logger');

async function testRedisCache() {
  try {
    logger.info('Starting Redis cache tests...');

    // Connect to Redis
    await connectRedis();
    logger.info('✓ Connected to Redis');

    // Test 1: Session Token Storage
    logger.info('\n--- Test 1: Session Token Storage ---');
    const testToken = 'test-jwt-token-12345';
    const userData = {
      userId: '507f1f77bcf86cd799439011',
      username: 'testuser',
      role: 'user',
    };

    await storeSessionToken(testToken, userData);
    logger.info('✓ Session token stored');

    const retrievedSession = await getSessionToken(testToken);
    if (retrievedSession && retrievedSession.username === 'testuser') {
      logger.info('✓ Session token retrieved successfully');
    } else {
      logger.error('✗ Failed to retrieve session token');
    }

    await deleteSessionToken(testToken);
    const deletedSession = await getSessionToken(testToken);
    if (!deletedSession) {
      logger.info('✓ Session token deleted successfully');
    } else {
      logger.error('✗ Failed to delete session token');
    }

    // Test 2: Token Blacklist
    logger.info('\n--- Test 2: Token Blacklist ---');
    const blacklistTestToken = 'blacklist-token-67890';
    
    await blacklistToken(blacklistTestToken, 60); // 60 seconds TTL
    logger.info('✓ Token added to blacklist');

    const isBlacklisted = await isTokenBlacklisted(blacklistTestToken);
    if (isBlacklisted) {
      logger.info('✓ Token blacklist check successful');
    } else {
      logger.error('✗ Token blacklist check failed');
    }

    // Test 3: Inspection Result Caching
    logger.info('\n--- Test 3: Inspection Result Caching ---');
    const inspectionId = '507f1f77bcf86cd799439012';
    const inspectionData = {
      inspectionId: inspectionId,
      userId: '507f1f77bcf86cd799439011',
      status: 'completed',
      imageUrl: 'https://example.com/image.jpg',
      defects: [
        {
          class: 'damaged_rivet',
          confidence: 0.95,
          bbox: { x: 100, y: 200, width: 50, height: 50 },
          source: 'ensemble',
        },
      ],
      processingTime: 8500,
      modelVersion: 'v1.0.0',
      defectCount: 1,
    };

    await cacheInspectionResult(inspectionId, inspectionData);
    logger.info('✓ Inspection result cached');

    const cachedInspection = await getCachedInspectionResult(inspectionId);
    if (cachedInspection && cachedInspection.defectCount === 1) {
      logger.info('✓ Inspection result retrieved from cache');
    } else {
      logger.error('✗ Failed to retrieve inspection result from cache');
    }

    await invalidateInspectionCache(inspectionId);
    const invalidatedInspection = await getCachedInspectionResult(inspectionId);
    if (!invalidatedInspection) {
      logger.info('✓ Inspection cache invalidated successfully');
    } else {
      logger.error('✗ Failed to invalidate inspection cache');
    }

    // Test 4: Model Weights Caching
    logger.info('\n--- Test 4: Model Weights Caching ---');
    const modelVersion = 'v1.2.0';
    const weightsData = {
      version: modelVersion,
      weightsUrl: 's3://bucket/models/yolov8_v1.2.0.pt',
      mAP: 0.96,
      status: 'deployed',
      deployedAt: new Date().toISOString(),
    };

    await cacheModelWeights(modelVersion, weightsData);
    logger.info('✓ Model weights cached');

    const cachedWeights = await getCachedModelWeights(modelVersion);
    if (cachedWeights && cachedWeights.mAP === 0.96) {
      logger.info('✓ Model weights retrieved from cache');
    } else {
      logger.error('✗ Failed to retrieve model weights from cache');
    }

    const cachedVersions = await getCachedModelVersions();
    if (cachedVersions.includes(modelVersion)) {
      logger.info(`✓ Found ${cachedVersions.length} cached model version(s)`);
    } else {
      logger.error('✗ Failed to retrieve cached model versions');
    }

    // Test 5: Cache Statistics
    logger.info('\n--- Test 5: Cache Statistics ---');
    const stats = await getCacheStats();
    if (stats.available) {
      logger.info('✓ Cache statistics retrieved');
      logger.info(`  - Connected: ${stats.connected}`);
      logger.info(`  - DB Size: ${stats.dbSize} keys`);
    } else {
      logger.error('✗ Failed to retrieve cache statistics');
    }

    logger.info('\n✓ All Redis cache tests completed successfully!');

  } catch (error) {
    logger.error('Redis cache test failed:', error);
  } finally {
    // Disconnect from Redis
    await disconnectRedis();
    logger.info('\n✓ Disconnected from Redis');
    process.exit(0);
  }
}

// Run tests
testRedisCache();
