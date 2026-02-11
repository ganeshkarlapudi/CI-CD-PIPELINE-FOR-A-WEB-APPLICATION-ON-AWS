# Aircraft Defect Detection System - Dataflow, Request Follow-up, and Token Resolution

## Table of Contents
1. [System Overview](#system-overview)
2. [Authentication & Token Management](#authentication--token-management)
3. [Request Dataflow](#request-dataflow)
4. [Token Resolution Process](#token-resolution-process)
5. [Caching Strategy](#caching-strategy)
6. [Error Handling & Logging](#error-handling--logging)
7. [Security Layers](#security-layers)

---

## System Overview

The Aircraft Defect Detection System is a multi-tier application with the following architecture:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Backend   │────▶│ ML Service  │────▶│   OpenAI    │
│  (Browser)  │◀────│  (Node.js)  │◀────│  (Python)   │◀────│  GPT-Vision │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   MongoDB   │     │   Storage   │
                    │  (Database) │     │ (S3/Local)  │
                    └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │   (Cache)   │
                    └─────────────┘
```

### Key Components
- **Backend Server**: Express.js REST API (Port 3000)
- **ML Service**: Flask-based Python service (Port 5000)
- **Database**: MongoDB for persistent storage
- **Cache**: Redis for session management and result caching
- **Storage**: AWS S3 or local filesystem for images


---

## Authentication & Token Management

### 1. User Registration Flow

```
Client                    Backend                   MongoDB                Redis
  │                          │                         │                     │
  │──POST /api/auth/register─▶│                         │                     │
  │  {username, email, pwd}   │                         │                     │
  │                          │──Check username exists──▶│                     │
  │                          │◀────────────────────────│                     │
  │                          │──Check email exists─────▶│                     │
  │                          │◀────────────────────────│                     │
  │                          │──Hash password (bcrypt)  │                     │
  │                          │──Create user────────────▶│                     │
  │                          │◀────────────────────────│                     │
  │◀─────201 Created─────────│                         │                     │
  │  {success, userId}       │                         │                     │
```

**Key Details:**
- Password hashing: bcrypt with 10 salt rounds
- Default role: 'user'
- Validation: Username (3-30 chars), Email format, Password complexity
- Password requirements: Min 8 chars, uppercase, lowercase, digit, special char

### 2. User Login Flow

```
Client                    Backend                   MongoDB                Redis
  │                          │                         │                     │
  │──POST /api/auth/login────▶│                         │                     │
  │  {username, password}     │                         │                     │
  │                          │──Find user by username──▶│                     │
  │                          │◀────────────────────────│                     │
  │                          │──Check account locked    │                     │
  │                          │──Check account status    │                     │
  │                          │──Verify password (bcrypt)│                     │
  │                          │──Generate JWT token      │                     │
  │                          │──Store session──────────────────────────────▶│
  │                          │  {userId, username, role}│                     │
  │◀─────200 OK──────────────│                         │                     │
  │  {token, user}           │                         │                     │
```

**JWT Token Structure:**
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  username: "john_doe",
  role: "user",
  iat: 1700000000,  // Issued at
  exp: 1700086400   // Expires in 24h
}
```

**Session Storage in Redis:**
- Key: `session:{token}`
- Value: `{userId, username, role, createdAt}`
- TTL: 24 hours (86400 seconds)


### 3. User Logout Flow

```
Client                    Backend                   Redis
  │                          │                         │
  │──POST /api/auth/logout───▶│                         │
  │  Authorization: Bearer {token}                     │
  │                          │──Authenticate token     │
  │                          │──Add to blacklist───────▶│
  │                          │  Key: blacklist:{token} │
  │                          │  TTL: 24 hours          │
  │◀─────200 OK──────────────│                         │
  │  {success, message}      │                         │
```

**Token Blacklist:**
- Prevents reuse of logged-out tokens
- Key: `blacklist:{token}`
- Value: `"true"`
- TTL: 24 hours (matches token expiration)

---

## Request Dataflow

### Complete Inspection Analysis Flow

This is the most complex flow in the system, involving multiple services and asynchronous processing.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: IMAGE UPLOAD                            │
└─────────────────────────────────────────────────────────────────────────┘

Client                Backend              Storage            MongoDB
  │                      │                    │                  │
  │──POST /inspections/upload (multipart)────▶│                  │
  │  Authorization: Bearer {token}            │                  │
  │  Content-Type: multipart/form-data        │                  │
  │  images: [file1, file2, ...]              │                  │
  │                      │                    │                  │
  │                      │──Authenticate──────┤                  │
  │                      │──Validate files    │                  │
  │                      │  (size, type, dims)│                  │
  │                      │──Process image     │                  │
  │                      │  (resize, optimize)│                  │
  │                      │──Calculate quality │                  │
  │                      │──Upload file───────▶│                  │
  │                      │◀───imageUrl────────│                  │
  │                      │──Create inspection─────────────────▶│
  │                      │  {userId, imageUrl, status: uploaded}│
  │◀─────201 Created─────│◀──────────────────────────────────│
  │  {inspectionIds[]}   │                    │                  │
```


```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: TRIGGER ML ANALYSIS                         │
└─────────────────────────────────────────────────────────────────────────┘

Client                Backend              MongoDB            ML Service
  │                      │                    │                  │
  │──POST /inspections/:id/analyze───────────▶│                  │
  │  Authorization: Bearer {token}            │                  │
  │                      │                    │                  │
  │                      │──Authenticate──────┤                  │
  │                      │──Find inspection───▶│                  │
  │                      │◀───inspection──────│                  │
  │                      │──Validate status   │                  │
  │                      │  (must be uploaded)│                  │
  │                      │──Update status─────▶│                  │
  │                      │  status: processing│                  │
  │                      │──Invalidate cache  │                  │
  │◀─────202 Accepted────│                    │                  │
  │  {status: processing}│                    │                  │
  │                      │                    │                  │
  │                      │──POST /ml/detect (async)──────────────▶│
  │                      │  {imageUrl, inspectionId}              │
  │                      │                    │                  │
  │                      │  [Fire and forget - no wait]          │
  │                      │                    │                  │
```

**Key Points:**
- Returns 202 Accepted immediately (non-blocking)
- ML analysis happens asynchronously
- Client must poll for results
- Status updated to "processing"
- Cache invalidated to prevent stale data


```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: ML PROCESSING (ASYNC)                       │
└─────────────────────────────────────────────────────────────────────────┘

ML Service            YOLO Model          GPT-Vision         Ensemble
  │                      │                    │                  │
  │──Load image          │                    │                  │
  │──Preprocess          │                    │                  │
  │──YOLO detection──────▶│                    │                  │
  │◀─defects (bbox, conf)│                    │                  │
  │──GPT-Vision analysis─────────────────────▶│                  │
  │  {image, prompt}     │                    │                  │
  │◀─defects (class, conf)────────────────────│                  │
  │──Aggregate results──────────────────────────────────────────▶│
  │  {yolo_defects, gpt_defects}              │                  │
  │  weights: {yolo: 0.6, gpt: 0.4}           │                  │
  │◀─final_defects (NMS applied)──────────────────────────────────│
  │                      │                    │                  │
```

**ML Processing Details:**

1. **YOLO Detection:**
   - Model: YOLOv8n (configurable)
   - Confidence threshold: 0.5
   - NMS IOU threshold: 0.45
   - Image size: 640x640
   - Output: Bounding boxes with class and confidence

2. **GPT-Vision Analysis:**
   - Model: gpt-4-vision-preview
   - Max tokens: 1000
   - Temperature: 0.2
   - Prompt: Structured defect detection
   - Output: Defect classes with confidence scores

3. **Ensemble Aggregation:**
   - YOLO weight: 0.6
   - GPT weight: 0.4
   - NMS IOU threshold: 0.5
   - Min confidence: 0.5
   - Combines detections from both models
   - Removes duplicate detections


```
┌─────────────────────────────────────────────────────────────────────────┐
│                  PHASE 4: RESULTS CALLBACK & STORAGE                    │
└─────────────────────────────────────────────────────────────────────────┘

ML Service            Backend              MongoDB            ApiLog
  │                      │                    │                  │
  │──Analysis complete   │                    │                  │
  │──POST callback───────▶│                    │                  │
  │  {success, data}     │                    │                  │
  │  data: {             │                    │                  │
  │    defects[],        │                    │                  │
  │    processingTime,   │                    │                  │
  │    modelVersion,     │                    │                  │
  │    metadata          │                    │                  │
  │  }                   │                    │                  │
  │                      │──Find inspection───▶│                  │
  │                      │◀───inspection──────│                  │
  │                      │──Update inspection─▶│                  │
  │                      │  status: completed │                  │
  │                      │  defects: [...]    │                  │
  │                      │  processingTime    │                  │
  │                      │  modelVersion      │                  │
  │                      │──Log API call──────────────────────▶│
  │                      │  {service, endpoint, responseTime,  │
  │                      │   tokenUsage, cost}│                  │
  │◀─────200 OK──────────│                    │                  │
```

**Defect Data Structure:**
```javascript
{
  class: "damaged_rivet",
  confidence: 0.87,
  bbox: {
    x: 120,
    y: 340,
    width: 45,
    height: 38
  },
  source: "ensemble"  // or "yolo", "gpt-vision"
}
```

**API Logging:**
- Service: "ensemble", "yolo", or "gpt-vision"
- Endpoint: "/ml/detect"
- Response time: milliseconds
- Token usage: GPT-Vision tokens consumed
- Cost: Calculated based on token usage
- Status: "success" or "error"


```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: RETRIEVE RESULTS                            │
└─────────────────────────────────────────────────────────────────────────┘

Client                Backend              Redis              MongoDB
  │                      │                    │                  │
  │──GET /inspections/:id/results────────────▶│                  │
  │  Authorization: Bearer {token}            │                  │
  │                      │                    │                  │
  │                      │──Authenticate──────┤                  │
  │                      │──Check cache───────▶│                  │
  │                      │◀───cache miss──────│                  │
  │                      │──Find inspection───────────────────▶│
  │                      │◀───inspection──────────────────────│
  │                      │──Cache result──────▶│                  │
  │                      │  TTL: 1 hour       │                  │
  │◀─────200 OK──────────│                    │                  │
  │  {data, cached: false}                    │                  │
  │                      │                    │                  │
  │──GET /inspections/:id/results (2nd call)─▶│                  │
  │                      │──Check cache───────▶│                  │
  │                      │◀───cache hit───────│                  │
  │◀─────200 OK──────────│                    │                  │
  │  {data, cached: true}│                    │                  │
```

**Status-Based Responses:**

1. **Status: "processing"**
   ```json
   {
     "success": true,
     "data": {
       "inspectionId": "...",
       "status": "processing",
       "message": "Analysis is still in progress. Please check back shortly."
     }
   }
   ```

2. **Status: "completed"**
   ```json
   {
     "success": true,
     "data": {
       "inspectionId": "...",
       "status": "completed",
       "defects": [...],
       "defectCount": 5,
       "processingTime": 2340,
       "modelVersion": "v1.0.0"
     },
     "cached": false
   }
   ```

3. **Status: "failed"**
   ```json
   {
     "success": true,
     "data": {
       "inspectionId": "...",
       "status": "failed",
       "errorMessage": "ML service timeout",
       "message": "Analysis failed. Please try again."
     }
   }
   ```


---

## Token Resolution Process

### Detailed Authentication Middleware Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TOKEN RESOLUTION SEQUENCE                            │
└─────────────────────────────────────────────────────────────────────────┘

Request               Middleware           Redis              MongoDB
  │                      │                    │                  │
  │──API Request─────────▶│                    │                  │
  │  Authorization:      │                    │                  │
  │  Bearer eyJhbGc...   │                    │                  │
  │                      │                    │                  │
  │                   ┌──▼──────────────────────────────────────┐
  │                   │ STEP 1: Extract Token                   │
  │                   │ - Check Authorization header            │
  │                   │ - Verify "Bearer " prefix               │
  │                   │ - Extract token string                  │
  │                   └──┬──────────────────────────────────────┘
  │                      │                    │                  │
  │                   ┌──▼──────────────────────────────────────┐
  │                   │ STEP 2: Check Blacklist                 │
  │                   │ - Query Redis: blacklist:{token}        │
  │                   └──┬──────────────────────────────────────┘
  │                      │                    │                  │
  │                      │──isBlacklisted?────▶│                  │
  │                      │◀───false───────────│                  │
  │                      │                    │                  │
  │                   ┌──▼──────────────────────────────────────┐
  │                   │ STEP 3: Check Session Cache             │
  │                   │ - Query Redis: session:{token}          │
  │                   └──┬──────────────────────────────────────┘
  │                      │                    │                  │
  │                      │──getSession────────▶│                  │
  │                      │◀───sessionData─────│                  │
  │                      │  {userId, username, role}             │
  │                      │                    │                  │
  │                   ┌──▼──────────────────────────────────────┐
  │                   │ STEP 4: Verify JWT Signature            │
  │                   │ - jwt.verify(token, JWT_SECRET)         │
  │                   │ - Check expiration                      │
  │                   │ - Validate structure                    │
  │                   └──┬──────────────────────────────────────┘
  │                      │                    │                  │
  │                   ┌──▼──────────────────────────────────────┐
  │                   │ STEP 5: User Validation                 │
  │                   │ - If cached: use session data           │
  │                   │ - If not cached: fetch from MongoDB     │
  │                   └──┬──────────────────────────────────────┘
  │                      │                    │                  │
  │                      │──Find user (if needed)────────────────▶│
  │                      │◀───user data───────────────────────────│
  │                      │                    │                  │
  │                   ┌──▼──────────────────────────────────────┐
  │                   │ STEP 6: Check Account Status            │
  │                   │ - Verify status === 'active'            │
  │                   │ - Check not locked                      │
  │                   └──┬──────────────────────────────────────┘
  │                      │                    │                  │
  │                   ┌──▼──────────────────────────────────────┐
  │                   │ STEP 7: Attach User to Request          │
  │                   │ - req.user = {userId, username, role}   │
  │                   │ - req.token = token                     │
  │                   └──┬──────────────────────────────────────┘
  │                      │                    │                  │
  │                      │──next()            │                  │
  │                      ▼                    │                  │
  │                   Route Handler           │                  │
```


### Error Scenarios in Token Resolution

```javascript
// Scenario 1: No Token Provided
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "No token provided"
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
// HTTP Status: 401 Unauthorized

// Scenario 2: Token Blacklisted (After Logout)
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Token has been invalidated"
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
// HTTP Status: 401 Unauthorized

// Scenario 3: Token Expired
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired"
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
// HTTP Status: 401 Unauthorized

// Scenario 4: Invalid Token Signature
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid token"
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
// HTTP Status: 401 Unauthorized

// Scenario 5: User Not Found
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "User not found"
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
// HTTP Status: 401 Unauthorized

// Scenario 6: Account Inactive
{
  "success": false,
  "error": {
    "code": "ACCOUNT_INACTIVE",
    "message": "Account has been deactivated"
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
// HTTP Status: 403 Forbidden
```

### Authorization Middleware (Role-Based)

After authentication, role-based authorization checks permissions:

```javascript
// Example: Admin-only endpoint
router.get('/admin/users', authenticate, authorize('admin'), handler);

// Authorization flow:
1. authenticate() - Verifies token and attaches req.user
2. authorize('admin') - Checks if req.user.role === 'admin'
3. If authorized: next() → handler
4. If not authorized: 403 Forbidden
```

**Authorization Error:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
```


---

## Caching Strategy

### Redis Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REDIS CACHE LAYERS                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  Session Cache       │  Key: session:{token}
│  TTL: 24 hours       │  Value: {userId, username, role, createdAt}
│  Purpose: Fast auth  │  Size: ~200 bytes per session
└──────────────────────┘

┌──────────────────────┐
│  Blacklist Cache     │  Key: blacklist:{token}
│  TTL: 24 hours       │  Value: "true"
│  Purpose: Logout     │  Size: ~50 bytes per token
└──────────────────────┘

┌──────────────────────┐
│  Inspection Cache    │  Key: inspection:{inspectionId}
│  TTL: 1 hour         │  Value: {full inspection result}
│  Purpose: Fast reads │  Size: ~2-10 KB per inspection
└──────────────────────┘

┌──────────────────────┐
│  Model Weights Cache │  Key: model:weights:{version}
│  TTL: Persistent     │  Value: {version, weightsUrl, mAP, status}
│  Purpose: ML config  │  Size: ~500 bytes per model
└──────────────────────┘
```

### Cache Hit/Miss Flow

```
Request Flow with Caching:

┌─────────────────────────────────────────────────────────────┐
│ GET /inspections/:id/results                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Check Redis Cache     │
              │ Key: inspection:{id}  │
              └───────────┬───────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
            Cache Hit           Cache Miss
                │                   │
                ▼                   ▼
        ┌───────────────┐   ┌──────────────────┐
        │ Return cached │   │ Query MongoDB    │
        │ data          │   │ Get inspection   │
        │ cached: true  │   └────────┬─────────┘
        └───────────────┘            │
                                     ▼
                            ┌──────────────────┐
                            │ Store in Redis   │
                            │ TTL: 1 hour      │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ Return data      │
                            │ cached: false    │
                            └──────────────────┘
```

### Cache Invalidation Strategies

1. **Session Cache:**
   - Invalidated on logout (added to blacklist)
   - Auto-expires after 24 hours
   - No manual invalidation needed

2. **Inspection Cache:**
   - Invalidated when re-analyzing inspection
   - Auto-expires after 1 hour
   - Manual invalidation: `invalidateInspectionCache(id)`

3. **Model Weights Cache:**
   - Persistent (no TTL)
   - Invalidated when model is archived
   - Manual invalidation: `invalidateModelWeightsCache(version)`

4. **Blacklist Cache:**
   - Auto-expires after 24 hours (matches token expiration)
   - No manual invalidation needed


### Cache Performance Metrics

```javascript
// Example cache statistics endpoint response
GET /api/admin/monitoring/cache-stats

{
  "success": true,
  "data": {
    "redis": {
      "available": true,
      "connected": true,
      "dbSize": 1247,  // Total keys in Redis
      "info": "..."    // Redis INFO stats
    },
    "cachedModels": {
      "count": 3,
      "versions": ["v1.0.0", "v1.1.0", "v2.0.0"]
    }
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
```

---

## Error Handling & Logging

### Request Lifecycle with Logging

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REQUEST LOGGING PIPELINE                             │
└─────────────────────────────────────────────────────────────────────────┘

Incoming Request
      │
      ▼
┌─────────────────┐
│ requestTimer    │  Attach start time to req._startTime
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ requestId       │  Generate unique ID: req.id = uuid()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ requestLogger   │  Log: "Incoming request: {method} {url}"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ authenticate    │  Verify token, attach user
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route Handler   │  Process business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Response Sent   │  Calculate duration: Date.now() - req._startTime
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log Response    │  Log: "Request completed: {status} in {duration}ms"
└─────────────────┘
```

### Logging Levels and Destinations

```javascript
// Winston Logger Configuration
{
  levels: {
    error: 0,    // Critical errors requiring immediate attention
    warn: 1,     // Warning conditions
    info: 2,     // Informational messages
    debug: 3     // Debug-level messages
  },
  
  transports: [
    // Console output (development)
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Error log file
    new winston.transports.File({
      filename: './logs/error.log',
      level: 'error',
      maxsize: 10485760,  // 10MB
      maxFiles: 14        // 14 days
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: './logs/combined.log',
      level: 'info',
      maxsize: 10485760,
      maxFiles: 14
    }),
    
    // Warnings log file
    new winston.transports.File({
      filename: './logs/warnings.log',
      level: 'warn',
      maxsize: 10485760,
      maxFiles: 14
    })
  ]
}
```


### System Logging to MongoDB

```javascript
// SystemLog Model Structure
{
  level: "error",              // info, warning, error, critical
  component: "ml-service",     // Component that generated the log
  message: "ML service timeout",
  details: {                   // Additional context
    inspectionId: "...",
    timeout: 60000,
    attempt: 1
  },
  userId: ObjectId("..."),     // User associated with the action
  timestamp: ISODate("..."),
  resolved: false              // For tracking error resolution
}

// API Log Model Structure
{
  service: "gpt-vision",       // ensemble, yolo, gpt-vision
  endpoint: "/ml/detect",
  userId: ObjectId("..."),
  inspectionId: ObjectId("..."),
  requestData: {
    imageUrl: "...",
    inspectionId: "..."
  },
  responseTime: 2340,          // milliseconds
  status: "success",           // success, error
  tokenUsage: {
    prompt_tokens: 1250,
    completion_tokens: 150,
    total_tokens: 1400
  },
  cost: 0.042,                 // USD
  errorMessage: null,
  timestamp: ISODate("...")
}
```

### Error Response Format

All API errors follow a consistent format:

```javascript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",           // Machine-readable error code
    "message": "Human-readable message",
    "details": "Additional context"  // Optional, only in development
  },
  "timestamp": "2024-11-20T10:30:00.000Z"
}
```

**Common Error Codes:**
- `AUTH_FAILED` - Authentication failed
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_TOKEN` - Invalid JWT token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Input validation failed
- `UPLOAD_FAILED` - File upload failed
- `SERVER_ERROR` - Internal server error
- `ML_SERVICE_ERROR` - ML service unavailable


---

## Security Layers

### Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                 │
└─────────────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
├── Helmet.js (Security headers)
│   ├── X-Content-Type-Options: nosniff
│   ├── X-Frame-Options: DENY
│   ├── X-XSS-Protection: 1; mode=block
│   └── Strict-Transport-Security: max-age=31536000
├── CORS (Cross-Origin Resource Sharing)
│   ├── Whitelist: Configured allowed origins
│   └── Credentials: true (for cookies)
└── Rate Limiting
    ├── General API: 100 requests/minute
    ├── Auth endpoints: 10 requests/15 minutes
    └── Upload endpoints: 20 requests/minute

Layer 2: Input Validation
├── Request Body Validation
│   ├── JSON schema validation
│   ├── Type checking
│   └── Range validation
├── File Validation
│   ├── File type: image/jpeg, image/png, image/tiff
│   ├── File size: Max 50MB
│   ├── Image dimensions: 640-4096 pixels
│   └── Max files per upload: 10
└── XSS Sanitization
    └── Strip HTML/script tags from inputs

Layer 3: Authentication
├── JWT Token Verification
│   ├── Signature validation
│   ├── Expiration check
│   └── Structure validation
├── Session Management
│   ├── Redis-based sessions
│   ├── 24-hour TTL
│   └── Blacklist on logout
└── Account Security
    ├── Password hashing (bcrypt, 10 rounds)
    ├── Failed login tracking
    └── Account lockout (5 attempts, 15 min)

Layer 4: Authorization
├── Role-Based Access Control (RBAC)
│   ├── Roles: user, admin
│   ├── Route-level authorization
│   └── Resource ownership checks
└── Account Status Checks
    ├── Active/Inactive status
    └── Locked account detection

Layer 5: Data Protection
├── Password Security
│   ├── Never stored in plain text
│   ├── Bcrypt hashing
│   └── Excluded from API responses
├── Sensitive Data Filtering
│   ├── Remove password from user objects
│   ├── Sanitize error messages
│   └── Limit stack traces to development
└── Secure Token Storage
    ├── Redis encryption at rest
    └── HTTPS for token transmission
```


### Rate Limiting Configuration

```javascript
// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 60000,              // 1 minute
  max: 100,                     // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,        // Return rate limit info in headers
  legacyHeaders: false
});

// Auth Endpoint Rate Limiter (Stricter)
const authLimiter = rateLimit({
  windowMs: 900000,             // 15 minutes
  max: 10,                      // 10 requests per window
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    }
  }
});

// Upload Endpoint Rate Limiter
const uploadLimiter = rateLimit({
  windowMs: 60000,              // 1 minute
  max: 20,                      // 20 requests per window
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests, please try again later'
    }
  }
});
```

### Account Lockout Mechanism

```javascript
// User Model - Login Attempt Tracking
{
  loginAttempts: 0,
  lockoutUntil: null,
  
  // Increment failed login attempts
  incrementLoginAttempts: async function() {
    this.loginAttempts += 1;
    
    // Lock account after 5 failed attempts
    if (this.loginAttempts >= 5) {
      this.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    
    await this.save();
  },
  
  // Reset login attempts on successful login
  resetLoginAttempts: async function() {
    this.loginAttempts = 0;
    this.lockoutUntil = null;
    await this.save();
  },
  
  // Check if account is locked
  get isLocked() {
    return this.lockoutUntil && this.lockoutUntil > Date.now();
  }
}
```


---

## Complete Request Examples

### Example 1: User Registration to First Inspection

```bash
# Step 1: Register User
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Response:
{
  "success": true,
  "message": "User registered successfully",
  "userId": "507f1f77bcf86cd799439011",
  "timestamp": "2024-11-20T10:00:00.000Z"
}

# Step 2: Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'

# Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  },
  "timestamp": "2024-11-20T10:01:00.000Z"
}

# Step 3: Upload Image
curl -X POST http://localhost:3000/api/inspections/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "images=@aircraft_wing.jpg"

# Response:
{
  "success": true,
  "data": {
    "inspections": [
      {
        "inspectionId": "507f1f77bcf86cd799439012",
        "filename": "aircraft_wing.jpg",
        "qualityScore": 85
      }
    ],
    "totalUploaded": 1,
    "totalFailed": 0
  },
  "message": "Successfully uploaded 1 image(s)",
  "timestamp": "2024-11-20T10:02:00.000Z"
}

# Step 4: Trigger Analysis
curl -X POST http://localhost:3000/api/inspections/507f1f77bcf86cd799439012/analyze \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response:
{
  "success": true,
  "data": {
    "inspectionId": "507f1f77bcf86cd799439012",
    "status": "processing",
    "message": "Analysis started. Check back for results."
  },
  "timestamp": "2024-11-20T10:02:30.000Z"
}

# Step 5: Poll for Results (after a few seconds)
curl -X GET http://localhost:3000/api/inspections/507f1f77bcf86cd799439012/results \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response:
{
  "success": true,
  "data": {
    "inspectionId": "507f1f77bcf86cd799439012",
    "status": "completed",
    "imageUrl": "https://storage.example.com/aircraft_wing.jpg",
    "defects": [
      {
        "class": "damaged_rivet",
        "confidence": 0.87,
        "bbox": { "x": 120, "y": 340, "width": 45, "height": 38 },
        "source": "ensemble"
      },
      {
        "class": "scratch",
        "confidence": 0.92,
        "bbox": { "x": 450, "y": 210, "width": 120, "height": 15 },
        "source": "ensemble"
      }
    ],
    "defectCount": 2,
    "processingTime": 2340,
    "modelVersion": "v1.0.0"
  },
  "cached": false,
  "timestamp": "2024-11-20T10:03:00.000Z"
}
```


### Example 2: Admin Model Deployment

```bash
# Step 1: Login as Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "AdminPass123!"
  }'

# Response includes admin token

# Step 2: Get All Models
curl -X GET http://localhost:3000/api/admin/models \
  -H "Authorization: Bearer {admin_token}"

# Response:
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "507f1f77bcf86cd799439013",
        "version": "v2.0.0",
        "type": "yolov8n",
        "status": "trained",
        "mAP": 0.96,
        "precision": 0.94,
        "recall": 0.93,
        "f1Score": 0.935,
        "weightsUrl": "s3://models/v2.0.0/weights.pt",
        "createdAt": "2024-11-15T10:00:00.000Z",
        "deployedAt": null
      },
      {
        "id": "507f1f77bcf86cd799439014",
        "version": "v1.0.0",
        "type": "yolov8n",
        "status": "deployed",
        "mAP": 0.95,
        "weightsUrl": "s3://models/v1.0.0/weights.pt",
        "createdAt": "2024-11-01T10:00:00.000Z",
        "deployedAt": "2024-11-01T12:00:00.000Z"
      }
    ],
    "total": 2
  },
  "timestamp": "2024-11-20T10:00:00.000Z"
}

# Step 3: Deploy New Model (v2.0.0 has mAP > 0.95)
curl -X POST http://localhost:3000/api/admin/models/v2.0.0/deploy \
  -H "Authorization: Bearer {admin_token}"

# Response:
{
  "success": true,
  "data": {
    "version": "v2.0.0",
    "status": "deployed",
    "mAP": 0.96,
    "deployedAt": "2024-11-20T10:05:00.000Z",
    "message": "Model version \"v2.0.0\" deployed successfully"
  },
  "timestamp": "2024-11-20T10:05:00.000Z"
}

# Behind the scenes:
# 1. Previous deployed model (v1.0.0) archived
# 2. v2.0.0 status changed to "deployed"
# 3. Model weights cached in Redis (persistent)
# 4. ML service notified to reload model
```


### Example 3: Monitoring and Analytics

```bash
# Get System Metrics
curl -X GET "http://localhost:3000/api/admin/monitoring/metrics?startDate=2024-11-01&endDate=2024-11-20" \
  -H "Authorization: Bearer {admin_token}"

# Response:
{
  "success": true,
  "data": {
    "dateRange": {
      "start": "2024-11-01T00:00:00.000Z",
      "end": "2024-11-20T23:59:59.999Z"
    },
    "inspections": {
      "total": 1247,
      "completed": 1198,
      "failed": 49,
      "completionRate": "96.07%"
    },
    "performance": {
      "avgProcessingTime": 2340,
      "minProcessingTime": 1200,
      "maxProcessingTime": 5800,
      "unit": "milliseconds"
    },
    "apiUsage": {
      "total": 2495,
      "byService": [
        {
          "service": "ensemble",
          "calls": 1198,
          "avgResponseTime": 2340,
          "totalCost": 0,
          "errorCount": 49,
          "successRate": "95.91%"
        },
        {
          "service": "gpt-vision",
          "calls": 1198,
          "avgResponseTime": 1850,
          "totalCost": 47.92,
          "errorCount": 12,
          "successRate": "99.00%"
        },
        {
          "service": "yolo",
          "calls": 1198,
          "avgResponseTime": 490,
          "totalCost": 0,
          "errorCount": 5,
          "successRate": "99.58%"
        }
      ]
    },
    "apiCosts": {
      "total": 47.92,
      "totalCalls": 2495,
      "gptVision": {
        "calls": 1198,
        "totalCost": 47.92,
        "avgCostPerCall": "0.0400"
      }
    },
    "errors": {
      "total": 66,
      "byLevel": {
        "error": 49,
        "warning": 15,
        "critical": 2
      }
    },
    "users": {
      "active": 87
    }
  },
  "timestamp": "2024-11-20T10:00:00.000Z"
}

# Get System Logs with Filtering
curl -X GET "http://localhost:3000/api/admin/monitoring/logs?severity=error,critical&page=1&limit=20" \
  -H "Authorization: Bearer {admin_token}"

# Response:
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "507f1f77bcf86cd799439015",
        "level": "error",
        "component": "ml-service",
        "message": "ML service timeout",
        "details": {
          "inspectionId": "507f1f77bcf86cd799439012",
          "timeout": 60000
        },
        "user": {
          "id": "507f1f77bcf86cd799439011",
          "username": "john_doe",
          "email": "john@example.com"
        },
        "timestamp": "2024-11-20T09:45:00.000Z",
        "resolved": false
      }
    ],
    "pagination": {
      "total": 51,
      "page": 1,
      "pages": 3,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "severity": "error,critical",
      "startDate": null,
      "endDate": null,
      "component": null,
      "resolved": null
    }
  },
  "timestamp": "2024-11-20T10:00:00.000Z"
}
```


---

## Performance Optimization Strategies

### 1. Database Query Optimization

```javascript
// Efficient pagination with lean()
const inspections = await Inspection.find(filter)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .select('-__v')        // Exclude version field
  .lean();               // Return plain JS objects (faster)

// Parallel queries for better performance
const [inspections, total] = await Promise.all([
  Inspection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  Inspection.countDocuments(filter)
]);

// Index optimization (defined in models)
inspectionSchema.index({ userId: 1, createdAt: -1 });
inspectionSchema.index({ status: 1 });
inspectionSchema.index({ 'defects.class': 1 });
```

### 2. Redis Caching Strategy

```javascript
// Cache frequently accessed data
// - Session tokens: 24-hour TTL
// - Inspection results: 1-hour TTL
// - Model weights: Persistent (no TTL)

// Cache hit rate optimization
// 1. Cache completed inspections immediately
// 2. Invalidate cache on re-analysis
// 3. Use Redis for session management (avoid DB queries)

// Example: Session cache reduces DB queries by ~95%
// Without cache: Every request → MongoDB query
// With cache: First request → MongoDB, subsequent → Redis
```

### 3. Asynchronous Processing

```javascript
// Non-blocking ML analysis
// 1. Accept upload request
// 2. Return 202 Accepted immediately
// 3. Process ML analysis in background
// 4. Client polls for results

// Benefits:
// - No timeout issues
// - Better user experience
// - Scalable architecture
// - Can handle long-running tasks
```

### 4. Connection Pooling

```javascript
// MongoDB connection pool
mongoose.connect(uri, {
  maxPoolSize: 100,           // Max connections
  minPoolSize: 10,            // Min connections
  connectTimeoutMS: 10000,    // Connection timeout
  socketTimeoutMS: 45000      // Socket timeout
});

// Redis connection with reconnection strategy
const redisClient = redis.createClient({
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max retries exceeded');
      return Math.min(retries * 50, 3000);  // Exponential backoff
    }
  }
});
```

### 5. Request Optimization

```javascript
// Middleware ordering for performance
app.use(requestTimer);        // First: Track timing
app.use(requestId);           // Generate unique ID
app.use(helmet());            // Security headers
app.use(cors());              // CORS handling
app.use(express.json());      // Body parsing
app.use(sanitizeInput);       // XSS protection
app.use(requestLogger);       // Logging
app.use('/api', apiLimiter);  // Rate limiting

// Route-specific optimizations
// - Validate early (fail fast)
// - Use middleware composition
// - Cache expensive operations
```


---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Token Expired Error

**Symptom:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired"
  }
}
```

**Solution:**
- User must login again to get a new token
- Tokens expire after 24 hours by default
- Frontend should handle 401 errors and redirect to login

**Prevention:**
- Implement token refresh mechanism
- Store token expiration time on client
- Proactively refresh before expiration

---

#### 2. Redis Connection Failed

**Symptom:**
```
Redis Client Error: ECONNREFUSED
Application will continue without Redis caching
```

**Impact:**
- Session caching disabled (slower authentication)
- Inspection result caching disabled
- Token blacklist disabled (logout still works via JWT expiration)

**Solution:**
1. Check Redis server is running: `redis-cli ping`
2. Verify REDIS_URL in .env file
3. Check network connectivity
4. Review Redis logs

**Workaround:**
- Application continues to function without Redis
- Performance degraded but functional

---

#### 3. ML Service Timeout

**Symptom:**
```json
{
  "success": true,
  "data": {
    "inspectionId": "...",
    "status": "failed",
    "errorMessage": "ML service timeout"
  }
}
```

**Causes:**
- ML service not running
- Network connectivity issues
- Large image processing time
- ML service overloaded

**Solution:**
1. Check ML service status: `curl http://localhost:5000/health`
2. Verify ML_SERVICE_URL in .env
3. Increase timeout: `ML_SERVICE_TIMEOUT=60000`
4. Check ML service logs
5. Restart ML service if needed

---

#### 4. Account Locked

**Symptom:**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account is locked due to multiple failed login attempts. Please try again in 15 minutes."
  }
}
```

**Cause:**
- 5 failed login attempts within short period

**Solution:**
- Wait 15 minutes for automatic unlock
- Admin can manually unlock via database:
  ```javascript
  db.users.updateOne(
    { username: "john_doe" },
    { $set: { loginAttempts: 0, lockoutUntil: null } }
  )
  ```

---

#### 5. Rate Limit Exceeded

**Symptom:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

**Limits:**
- General API: 100 requests/minute
- Auth endpoints: 10 requests/15 minutes
- Upload endpoints: 20 requests/minute

**Solution:**
- Wait for rate limit window to reset
- Implement exponential backoff on client
- For legitimate high-volume use, contact admin to adjust limits

---

#### 6. File Upload Failed

**Symptom:**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size of 50MB"
  }
}
```

**Common Causes:**
- File too large (>50MB)
- Invalid file type (not JPEG/PNG/TIFF)
- Image dimensions out of range (640-4096 pixels)
- Corrupted image file

**Solution:**
1. Check file size: Must be ≤50MB
2. Verify file type: JPEG, PNG, or TIFF only
3. Check dimensions: 640-4096 pixels
4. Try re-exporting image from source
5. Use image compression tool if needed


---

## API Endpoint Reference

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | User login |
| POST | `/api/auth/logout` | Yes | User logout |
| GET | `/api/auth/verify` | Yes | Verify token validity |

### Inspection Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/inspections/upload` | Yes | Upload images |
| GET | `/api/inspections` | Yes | Get inspection history |
| GET | `/api/inspections/:id` | Yes | Get inspection by ID |
| POST | `/api/inspections/:id/analyze` | Yes | Trigger ML analysis |
| GET | `/api/inspections/:id/results` | Yes | Get analysis results |
| GET | `/api/inspections/:id/report` | Yes | Generate report (JSON/PDF) |

### Admin - User Management

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| GET | `/api/admin/users` | Yes | Admin | List all users |
| POST | `/api/admin/users` | Yes | Admin | Create new user |
| PUT | `/api/admin/users/:id` | Yes | Admin | Update user |
| DELETE | `/api/admin/users/:id` | Yes | Admin | Deactivate user |

### Admin - Model Management

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| GET | `/api/admin/models` | Yes | Admin | List all models |
| POST | `/api/admin/models/train` | Yes | Admin | Upload training data |
| GET | `/api/admin/models/train/:jobId` | Yes | Admin | Get training status |
| POST | `/api/admin/models/:version/deploy` | Yes | Admin | Deploy model |

### Admin - Monitoring

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| GET | `/api/admin/monitoring/metrics` | Yes | Admin | Get system metrics |
| GET | `/api/admin/monitoring/logs` | Yes | Admin | Get system logs |
| GET | `/api/admin/monitoring/cache-stats` | Yes | Admin | Get cache statistics |
| POST | `/api/admin/monitoring/logs/client` | Yes | Any | Log frontend errors |

### Health Check

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | No | Server health check |
| GET | `/api-docs` | No | Swagger API documentation |

---

## Configuration Reference

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
APP_BASE_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/aircraft_detection
MONGO_POOL_SIZE=100
MONGO_CONNECT_TIMEOUT_MS=10000

# Redis
REDIS_URL=redis://localhost:6379
REDIS_SESSION_TTL=86400
REDIS_INSPECTION_CACHE_TTL=3600

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h
BCRYPT_SALT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Storage
USE_LOCAL_STORAGE=true
UPLOAD_DIR=./uploads
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# ML Service
ML_SERVICE_URL=http://localhost:5000
ML_SERVICE_TIMEOUT=30000
MOCK_ML_SERVICE=false

# OpenAI
OPENAI_API_KEY=your-openai-api-key
GPT_VISION_MODEL=gpt-4-vision-preview
GPT_VISION_MAX_TOKENS=1000
GPT_VISION_TEMPERATURE=0.2

# YOLO Configuration
YOLO_MODEL_PATH=./ml-service/models/yolov8n.pt
YOLO_CONFIDENCE_THRESHOLD=0.5
YOLO_IMAGE_SIZE=640

# Ensemble Configuration
ENSEMBLE_YOLO_WEIGHT=0.6
ENSEMBLE_GPT_WEIGHT=0.4
ENSEMBLE_MIN_CONFIDENCE=0.5

# File Upload
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/tiff
MIN_IMAGE_DIMENSION=640
MAX_IMAGE_DIMENSION=4096

# Security
CORS_ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=10
HELMET_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
LOG_CONSOLE_ENABLED=true
```

---

## Conclusion

This document provides a comprehensive overview of the Aircraft Defect Detection System's dataflow, request handling, token resolution, and security architecture. Key takeaways:

1. **Multi-layered Security**: Authentication, authorization, rate limiting, and input validation
2. **Efficient Caching**: Redis-based caching for sessions, inspections, and model weights
3. **Asynchronous Processing**: Non-blocking ML analysis with polling-based result retrieval
4. **Comprehensive Logging**: Request tracking, error logging, and API usage monitoring
5. **Scalable Architecture**: Connection pooling, query optimization, and horizontal scalability

For additional information, refer to:
- [API Documentation](../03-api-documentation/API_DOCUMENTATION.md)
- [Security Implementation](../04-security/SECURITY_IMPLEMENTATION.md)
- [Configuration Guide](../02-configuration/CONFIGURATION.md)
- [Testing Guide](../05-testing/INTEGRATION_TESTS_QUICK_START.md)
