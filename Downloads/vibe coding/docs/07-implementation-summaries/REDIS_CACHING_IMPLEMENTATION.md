# Redis Caching Layer Implementation

## Overview

This document describes the Redis caching layer implementation for the Aircraft Defect Detection System. The caching layer improves performance by reducing database queries and provides session management capabilities.

## Features Implemented

### 1. Session Token Storage (24-hour TTL)
- JWT tokens are stored in Redis with user session data
- Automatic expiration after 24 hours
- Reduces database queries for authentication
- Key format: `session:{token}`

### 2. Token Blacklist (for Logout)
- Invalidated tokens are added to a blacklist
- Prevents reuse of logged-out tokens
- Automatic cleanup after token expiration
- Key format: `blacklist:{token}`

### 3. Inspection Results Caching (1-hour TTL)
- Completed inspection results are cached
- Reduces database load for frequently accessed inspections
- Automatic cache invalidation when re-analyzing
- Key format: `inspection:{inspectionId}`

### 4. Model Weights Reference Caching (Persistent)
- Model metadata and weights URLs are cached
- No expiration (persistent until manually invalidated)
- Enables fast model version lookups
- Key format: `model:weights:{version}`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Auth Routes  │  Inspection Routes  │  Admin Routes         │
└───────┬───────┴──────────┬──────────┴──────────┬────────────┘
        │                  │                      │
        ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Redis Cache Service                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Session    │  │  Inspection  │  │    Model     │      │
│  │   Storage    │  │    Cache     │  │   Weights    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐                                           │
│  │    Token     │                                           │
│  │  Blacklist   │                                           │
│  └──────────────┘                                           │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  Redis Server │
                        └───────────────┘
```

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
```

For production with authentication:

```bash
REDIS_URL=redis://username:password@hostname:6379
```

### TTL Constants

Defined in `src/config/redis.js`:

```javascript
const TTL = {
  SESSION: 24 * 60 * 60,        // 24 hours
  INSPECTION_RESULT: 60 * 60,   // 1 hour
  MODEL_WEIGHTS: -1,            // Persistent (no expiration)
};
```

## API Reference

### Connection Management

#### `connectRedis()`
Establishes connection to Redis server with automatic reconnection strategy.

```javascript
const { connectRedis } = require('./src/config/redis');
await connectRedis();
```

#### `disconnectRedis()`
Gracefully disconnects from Redis server.

```javascript
await disconnectRedis();
```

#### `isRedisAvailable()`
Checks if Redis is connected and available.

```javascript
const available = isRedisAvailable();
```

### Session Management

#### `storeSessionToken(token, userData)`
Stores JWT token with user session data (24-hour TTL).

```javascript
await storeSessionToken(token, {
  userId: user._id,
  username: user.username,
  role: user.role,
});
```

#### `getSessionToken(token)`
Retrieves session data from cache.

```javascript
const sessionData = await getSessionToken(token);
// Returns: { userId, username, role, createdAt } or null
```

#### `deleteSessionToken(token)`
Removes session token from cache.

```javascript
await deleteSessionToken(token);
```

### Token Blacklist

#### `blacklistToken(token, expiresIn)`
Adds token to blacklist (default: 24 hours).

```javascript
await blacklistToken(token, 86400); // 24 hours in seconds
```

#### `isTokenBlacklisted(token)`
Checks if token is blacklisted.

```javascript
const isBlacklisted = await isTokenBlacklisted(token);
```

### Inspection Caching

#### `cacheInspectionResult(inspectionId, inspectionData)`
Caches inspection result (1-hour TTL).

```javascript
await cacheInspectionResult(inspectionId, {
  inspectionId,
  userId,
  status: 'completed',
  defects: [...],
  processingTime: 8500,
  // ... other fields
});
```

#### `getCachedInspectionResult(inspectionId)`
Retrieves cached inspection result.

```javascript
const cachedResult = await getCachedInspectionResult(inspectionId);
// Returns: inspection data or null
```

#### `invalidateInspectionCache(inspectionId)`
Removes inspection from cache.

```javascript
await invalidateInspectionCache(inspectionId);
```

### Model Weights Caching

#### `cacheModelWeights(modelVersion, weightsData)`
Caches model weights reference (persistent).

```javascript
await cacheModelWeights('v1.2.0', {
  version: 'v1.2.0',
  weightsUrl: 's3://bucket/models/yolov8_v1.2.0.pt',
  mAP: 0.96,
  status: 'deployed',
  deployedAt: new Date(),
});
```

#### `getCachedModelWeights(modelVersion)`
Retrieves cached model weights reference.

```javascript
const weights = await getCachedModelWeights('v1.2.0');
```

#### `getCachedModelVersions()`
Lists all cached model versions.

```javascript
const versions = await getCachedModelVersions();
// Returns: ['v1.0.0', 'v1.1.0', 'v1.2.0']
```

#### `invalidateModelWeightsCache(modelVersion)`
Removes model weights from cache.

```javascript
await invalidateModelWeightsCache('v1.2.0');
```

### Utilities

#### `getCacheStats()`
Retrieves Redis cache statistics.

```javascript
const stats = await getCacheStats();
// Returns: { available, connected, dbSize, info }
```

#### `clearAllCache()`
Clears all cache entries (use with caution).

```javascript
await clearAllCache();
```

## Integration Points

### 1. Authentication Middleware (`src/middleware/auth.js`)

```javascript
// Check token blacklist
const blacklisted = await isTokenBlacklisted(token);

// Use cached session data
let sessionData = await getSessionToken(token);
```

### 2. Login Endpoint (`src/routes/auth.js`)

```javascript
// Store session on login
await storeSessionToken(token, {
  userId: user._id,
  username: user.username,
  role: user.role,
});
```

### 3. Logout Endpoint (`src/routes/auth.js`)

```javascript
// Blacklist token on logout
await blacklistToken(token, 86400);
```

### 4. Inspection Results Endpoint (`src/routes/inspections.js`)

```javascript
// Try cache first
const cachedResult = await getCachedInspectionResult(inspectionId);
if (cachedResult) {
  return res.json({ data: cachedResult, cached: true });
}

// Cache after fetching from database
await cacheInspectionResult(inspectionId, resultData);
```

### 5. Model Deployment Endpoint (`src/routes/admin.js`)

```javascript
// Cache model weights on deployment
await cacheModelWeights(model.version, {
  version: model.version,
  weightsUrl: model.weightsUrl,
  mAP: model.metrics.mAP,
  status: 'deployed',
  deployedAt: model.deployedAt,
});
```

### 6. Cache Statistics Endpoint (`src/routes/admin.js`)

```javascript
// GET /api/admin/monitoring/cache-stats
const cacheStats = await getCacheStats();
const cachedModels = await getCachedModelVersions();
```

## Error Handling

The Redis caching layer is designed to fail gracefully:

1. **Redis Unavailable**: Application continues without caching
2. **Connection Errors**: Automatic reconnection with exponential backoff
3. **Operation Failures**: Logged but don't block application flow

Example:

```javascript
if (!isRedisAvailable()) {
  logger.warn('Redis not available, skipping cache');
  return false;
}
```

## Performance Benefits

### Before Redis Caching

- Every authentication: 1 database query
- Every inspection result view: 1 database query
- Model weights lookup: 1 database query per request

### After Redis Caching

- Authentication with cached session: 0 database queries
- Inspection result view (cached): 0 database queries
- Model weights lookup (cached): 0 database queries

### Expected Improvements

- **Authentication**: ~50-70% reduction in database queries
- **Inspection Results**: ~80-90% reduction for frequently accessed inspections
- **Model Weights**: ~95% reduction in database queries
- **Response Time**: 10-50ms faster for cached requests

## Testing

### Manual Testing

Run the test script:

```bash
node test-redis-cache.js
```

This tests:
- Session token storage and retrieval
- Token blacklist functionality
- Inspection result caching
- Model weights caching
- Cache statistics

### Integration Testing

Test with actual API endpoints:

```bash
# Login (stores session)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Get inspection results (uses cache)
curl http://localhost:3000/api/inspections/{id}/results \
  -H "Authorization: Bearer {token}"

# Check cache stats (admin only)
curl http://localhost:3000/api/admin/monitoring/cache-stats \
  -H "Authorization: Bearer {admin-token}"
```

## Monitoring

### Cache Hit Rate

Monitor cache effectiveness:

```javascript
// In application code
const cacheHit = cachedResult !== null;
logger.info(`Cache ${cacheHit ? 'HIT' : 'MISS'} for inspection ${id}`);
```

### Redis Metrics

Access via admin endpoint:

```
GET /api/admin/monitoring/cache-stats
```

Returns:
- Connection status
- Database size (number of keys)
- Cached model versions
- Redis server info

## Maintenance

### Cache Invalidation

Caches are automatically invalidated when:

1. **Session tokens**: After 24 hours (TTL)
2. **Blacklisted tokens**: After 24 hours (TTL)
3. **Inspection results**: After 1 hour (TTL) or when re-analyzed
4. **Model weights**: Only when manually invalidated or new model deployed

### Manual Cache Clearing

For development/testing only:

```javascript
const { clearAllCache } = require('./src/config/redis');
await clearAllCache();
```

## Production Considerations

### Redis Configuration

For production, consider:

1. **Persistence**: Enable RDB or AOF persistence
2. **Memory Limits**: Set `maxmemory` and eviction policy
3. **Replication**: Use Redis Sentinel or Cluster for high availability
4. **Security**: Enable authentication and TLS
5. **Monitoring**: Use Redis monitoring tools (RedisInsight, Prometheus)

### Recommended Redis Configuration

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
requirepass your_strong_password
```

### Docker Compose Example

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD}
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  restart: unless-stopped
```

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check connection from Node.js
node -e "require('./src/config/redis').connectRedis().then(() => console.log('Connected'))"
```

### Cache Not Working

1. Check Redis URL in `.env`
2. Verify Redis server is running
3. Check application logs for Redis errors
4. Test with `test-redis-cache.js`

### High Memory Usage

1. Check number of cached keys: `redis-cli DBSIZE`
2. Review TTL settings
3. Consider reducing cache TTL or implementing LRU eviction

## Requirements Satisfied

This implementation satisfies the following requirements from the task:

✅ **Set up Redis client connection** - Implemented with automatic reconnection
✅ **Implement session token storage in Redis (24-hour TTL)** - Fully implemented
✅ **Cache model weights references** - Implemented with persistent storage
✅ **Cache frequently accessed inspection results (1-hour TTL)** - Fully implemented
✅ **Implement token blacklist for logout functionality** - Fully implemented

## Related Files

- `src/config/redis.js` - Redis service implementation
- `src/middleware/auth.js` - Authentication with Redis integration
- `src/routes/auth.js` - Login/logout with session management
- `src/routes/inspections.js` - Inspection caching
- `src/routes/admin.js` - Model weights caching and cache stats
- `test-redis-cache.js` - Test script
- `.env.example` - Configuration template

## References

- Requirements: 3.2 (Logout), 12.5 (Performance)
- Design Document: Caching Strategy section
- Redis Documentation: https://redis.io/docs/
