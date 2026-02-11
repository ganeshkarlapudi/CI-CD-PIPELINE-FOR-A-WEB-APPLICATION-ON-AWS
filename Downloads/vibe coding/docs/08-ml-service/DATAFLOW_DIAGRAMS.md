# Aircraft Defect Detection System - Visual Dataflow Diagrams

## Quick Reference Diagrams

### 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                     AIRCRAFT DEFECT DETECTION SYSTEM                 │
└──────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Client    │
                              │  (Browser)  │
                              └──────┬──────┘
                                     │
                         HTTP/HTTPS (REST API)
                                     │
                              ┌──────▼──────┐
                              │   Nginx     │
                              │ (Optional)  │
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            ┌───────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
            │  Static Files  │ │   API    │ │   WebSocket    │
            │   (Public)     │ │ Endpoints│ │   (Future)     │
            └────────────────┘ └────┬─────┘ └────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼────────┐ ┌───▼────────┐ ┌───▼────────┐
            │ Authentication │ │ Inspection │ │   Admin    │
            │    Routes      │ │   Routes   │ │   Routes   │
            └───────┬────────┘ └───┬────────┘ └───┬────────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼────────┐ ┌──▼──────┐ ┌────▼─────┐
            │    MongoDB     │ │  Redis  │ │ Storage  │
            │   (Database)   │ │ (Cache) │ │ (S3/FS)  │
            └────────────────┘ └─────────┘ └──────────┘
                                   │
                            ┌──────▼──────┐
                            │ ML Service  │
                            │  (Python)   │
                            └──────┬──────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼────────┐ ┌──▼──────────┐ ┌─▼──────────┐
            │  YOLO Model    │ │ GPT-Vision  │ │  Ensemble  │
            │   Detection    │ │   Analysis  │ │ Aggregator │
            └────────────────┘ └─────────────┘ └────────────┘
```


### 2. Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

    User                Client              Backend           MongoDB    Redis
     │                    │                    │                 │         │
     │──Enter credentials─▶│                    │                 │         │
     │                    │──POST /auth/login──▶│                 │         │
     │                    │  {username, pwd}   │                 │         │
     │                    │                    │──Find user──────▶│         │
     │                    │                    │◀────user────────│         │
     │                    │                    │                 │         │
     │                    │                    │──Verify password│         │
     │                    │                    │  (bcrypt)       │         │
     │                    │                    │                 │         │
     │                    │                    │──Generate JWT   │         │
     │                    │                    │  token          │         │
     │                    │                    │                 │         │
     │                    │                    │──Store session──────────▶│
     │                    │                    │  {userId, role} │         │
     │                    │◀─────token─────────│                 │         │
     │◀──Display success──│                    │                 │         │
     │                    │                    │                 │         │
     │                    │──Store token       │                 │         │
     │                    │  (localStorage)    │                 │         │
     │                    │                    │                 │         │
     │──Make API request──▶│                    │                 │         │
     │                    │──GET /inspections──▶│                 │         │
     │                    │  Authorization:    │                 │         │
     │                    │  Bearer {token}    │                 │         │
     │                    │                    │──Check blacklist────────▶│
     │                    │                    │◀────not found───────────│
     │                    │                    │                 │         │
     │                    │                    │──Get session────────────▶│
     │                    │                    │◀────session data────────│
     │                    │                    │                 │         │
     │                    │                    │──Verify JWT     │         │
     │                    │                    │  signature      │         │
     │                    │                    │                 │         │
     │                    │                    │──Attach user    │         │
     │                    │                    │  to request     │         │
     │                    │                    │                 │         │
     │                    │                    │──Process request│         │
     │                    │◀─────response──────│                 │         │
     │◀──Display data─────│                    │                 │         │
```


### 3. Complete Inspection Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                   INSPECTION ANALYSIS LIFECYCLE                     │
└─────────────────────────────────────────────────────────────────────┘

Client          Backend         Storage      MongoDB      ML Service    YOLO/GPT
  │               │               │             │              │            │
  │──Upload image─▶│               │             │              │            │
  │               │──Validate     │             │              │            │
  │               │──Process      │             │              │            │
  │               │──Upload───────▶│             │              │            │
  │               │◀──URL─────────│             │              │            │
  │               │──Create inspection──────────▶│              │            │
  │               │  status: uploaded            │              │            │
  │◀──201 Created─│               │             │              │            │
  │  {inspectionId}               │             │              │            │
  │               │               │             │              │            │
  │──Trigger analysis─────────────▶│             │              │            │
  │               │──Update status──────────────▶│              │            │
  │               │  status: processing          │              │            │
  │◀──202 Accepted│               │             │              │            │
  │  {processing} │               │             │              │            │
  │               │               │             │              │            │
  │               │──POST /ml/detect (async)────────────────▶│            │
  │               │  {imageUrl, inspectionId}   │              │            │
  │               │               │             │              │            │
  │               │               │             │              │──YOLO──────▶│
  │               │               │             │              │◀──defects──│
  │               │               │             │              │            │
  │               │               │             │              │──GPT───────▶│
  │               │               │             │              │◀──defects──│
  │               │               │             │              │            │
  │               │               │             │              │──Ensemble  │
  │               │               │             │              │  aggregate │
  │               │               │             │              │            │
  │               │◀──Callback (results)────────────────────────│            │
  │               │  {defects, processingTime}  │              │            │
  │               │──Update inspection──────────▶│              │            │
  │               │  status: completed           │              │            │
  │               │  defects: [...]              │              │            │
  │               │               │             │              │            │
  │──Poll results─▶│               │             │              │            │
  │               │──Get inspection─────────────▶│              │            │
  │               │◀──inspection with defects───│              │            │
  │◀──200 OK──────│               │             │              │            │
  │  {defects[]}  │               │             │              │            │
```


### 4. Token Resolution Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TOKEN RESOLUTION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

Request with Token
       │
       ▼
┌──────────────────┐
│ Extract Token    │
│ from Header      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ┌─────────────┐
│ Check Blacklist  │─────▶│   Redis     │
│ (Logged out?)    │◀─────│  blacklist: │
└────────┬─────────┘      └─────────────┘
         │
         │ Not Blacklisted
         ▼
┌──────────────────┐      ┌─────────────┐
│ Check Session    │─────▶│   Redis     │
│ Cache            │◀─────│  session:   │
└────────┬─────────┘      └─────────────┘
         │
         ├─ Cache Hit ──────────┐
         │                      │
         │ Cache Miss           │
         ▼                      │
┌──────────────────┐            │
│ Verify JWT       │            │
│ Signature        │            │
└────────┬─────────┘            │
         │                      │
         │ Valid                │
         ▼                      │
┌──────────────────┐      ┌─────────────┐
│ Fetch User from  │─────▶│  MongoDB    │
│ Database         │◀─────│   users     │
└────────┬─────────┘      └─────────────┘
         │                      │
         └──────────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Check Account    │
         │ Status           │
         │ - Active?        │
         │ - Not Locked?    │
         └────────┬─────────┘
                  │
                  │ Valid
                  ▼
         ┌──────────────────┐
         │ Attach User to   │
         │ Request Object   │
         │ req.user = {...} │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Continue to      │
         │ Route Handler    │
         └──────────────────┘

Error Paths:
├─ No Token ──────────────▶ 401 Unauthorized
├─ Blacklisted ───────────▶ 401 Token Invalidated
├─ Invalid Signature ─────▶ 401 Invalid Token
├─ Token Expired ─────────▶ 401 Token Expired
├─ User Not Found ────────▶ 401 User Not Found
└─ Account Inactive ──────▶ 403 Account Inactive
```


### 5. Caching Strategy Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REDIS CACHE LAYERS                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         SESSION CACHE                               │
│  Key Pattern: session:{token}                                       │
│  TTL: 24 hours                                                      │
│  Purpose: Fast authentication without DB queries                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ session:eyJhbGc... → {userId, username, role, createdAt}    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       BLACKLIST CACHE                               │
│  Key Pattern: blacklist:{token}                                     │
│  TTL: 24 hours                                                      │
│  Purpose: Prevent reuse of logged-out tokens                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ blacklist:eyJhbGc... → "true"                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      INSPECTION CACHE                               │
│  Key Pattern: inspection:{inspectionId}                             │
│  TTL: 1 hour                                                        │
│  Purpose: Fast retrieval of completed inspection results            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ inspection:507f... → {                                       │ │
│  │   inspectionId, status, defects[], processingTime,           │ │
│  │   modelVersion, imageUrl, createdAt                          │ │
│  │ }                                                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    MODEL WEIGHTS CACHE                              │
│  Key Pattern: model:weights:{version}                               │
│  TTL: Persistent (no expiration)                                    │
│  Purpose: ML service configuration and model metadata               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ model:weights:v1.0.0 → {                                     │ │
│  │   version, weightsUrl, mAP, status, deployedAt, cachedAt    │ │
│  │ }                                                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

Cache Hit/Miss Flow:
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌─────────────┐
│ Check Redis  │────▶│   Redis     │
└──────┬───────┘     └─────────────┘
       │
       ├─ Hit ──────▶ Return cached data (fast)
       │
       └─ Miss ─────▶ Query MongoDB ──▶ Cache result ──▶ Return data
```


### 6. Security Layers Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────┘

                            Incoming Request
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   Layer 1: Network       │
                    │   - Helmet (Headers)     │
                    │   - CORS (Origins)       │
                    │   - Rate Limiting        │
                    └────────────┬─────────────┘
                                 │ Pass
                                 ▼
                    ┌──────────────────────────┐
                    │   Layer 2: Input         │
                    │   - Body Validation      │
                    │   - File Validation      │
                    │   - XSS Sanitization     │
                    └────────────┬─────────────┘
                                 │ Valid
                                 ▼
                    ┌──────────────────────────┐
                    │   Layer 3: Authentication│
                    │   - JWT Verification     │
                    │   - Session Check        │
                    │   - Blacklist Check      │
                    └────────────┬─────────────┘
                                 │ Authenticated
                                 ▼
                    ┌──────────────────────────┐
                    │   Layer 4: Authorization │
                    │   - Role Check (RBAC)    │
                    │   - Resource Ownership   │
                    │   - Account Status       │
                    └────────────┬─────────────┘
                                 │ Authorized
                                 ▼
                    ┌──────────────────────────┐
                    │   Layer 5: Data Access   │
                    │   - Query Filtering      │
                    │   - Field Exclusion      │
                    │   - Sensitive Data Mask  │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                            Route Handler
                                 │
                                 ▼
                            Response
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Response Filtering     │
                    │   - Remove passwords     │
                    │   - Sanitize errors      │
                    │   - Add security headers │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                            Client

Failure at any layer → Appropriate error response (401, 403, 400, etc.)
```


### 7. ML Ensemble Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ML ENSEMBLE PROCESSING                           │
└─────────────────────────────────────────────────────────────────────┘

                        ML Service Receives Request
                        {imageUrl, inspectionId}
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Download Image      │
                        │  from Storage        │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Preprocess Image    │
                        │  - Resize to 640x640 │
                        │  - Normalize         │
                        │  - Format conversion │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌───────────────────────┐   ┌───────────────────────┐
        │   YOLO Detection      │   │  GPT-Vision Analysis  │
        │   - Load YOLOv8n      │   │  - Prepare prompt     │
        │   - Run inference     │   │  - Call OpenAI API    │
        │   - Confidence: 0.5   │   │  - Parse response     │
        │   - NMS: 0.45         │   │  - Extract defects    │
        └───────────┬───────────┘   └───────────┬───────────┘
                    │                           │
                    │  Detections               │  Detections
                    │  [{class, bbox, conf}]    │  [{class, conf}]
                    │                           │
                    └──────────────┬────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Ensemble Aggregator │
                        │  - Combine detections│
                        │  - Apply weights:    │
                        │    YOLO: 0.6         │
                        │    GPT: 0.4          │
                        │  - NMS: 0.5          │
                        │  - Min conf: 0.5     │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Final Detections    │
                        │  [{class, bbox,      │
                        │    confidence,       │
                        │    source}]          │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Send Callback       │
                        │  to Backend          │
                        │  POST /callback      │
                        └──────────────────────┘

Example Output:
{
  "success": true,
  "data": {
    "defects": [
      {
        "class": "damaged_rivet",
        "confidence": 0.87,
        "bbox": {"x": 120, "y": 340, "width": 45, "height": 38},
        "source": "ensemble"
      }
    ],
    "processingTime": 2340,
    "metadata": {
      "modelVersion": "v1.0.0",
      "yoloDetections": 3,
      "gptDetections": 2,
      "finalDetections": 2
    }
  }
}
```


### 8. Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA DIAGRAM                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       User           │
│──────────────────────│
│ _id: ObjectId (PK)   │
│ username: String     │◀──────────────┐
│ email: String        │               │
│ password: String     │               │ userId (FK)
│ role: String         │               │
│ status: String       │               │
│ loginAttempts: Number│               │
│ lockoutUntil: Date   │               │
│ createdAt: Date      │               │
└──────────────────────┘               │
                                       │
                                       │
┌──────────────────────┐               │
│    Inspection        │               │
│──────────────────────│               │
│ _id: ObjectId (PK)   │               │
│ userId: ObjectId ────┼───────────────┘
│ imageUrl: String     │
│ status: String       │
│ defects: [           │
│   {                  │
│     class: String    │
│     confidence: Num  │
│     bbox: Object     │
│     source: String   │
│   }                  │
│ ]                    │
│ processingTime: Num  │
│ modelVersion: String │◀──────────────┐
│ imageMetadata: Obj   │               │
│ errorMessage: String │               │
│ createdAt: Date      │               │
│ updatedAt: Date      │               │
└──────────────────────┘               │
                                       │
                                       │ version (FK)
┌──────────────────────┐               │
│       Model          │               │
│──────────────────────│               │
│ _id: ObjectId (PK)   │               │
│ version: String ─────┼───────────────┘
│ type: String         │
│ status: String       │
│ metrics: {           │
│   mAP: Number        │
│   precision: Number  │
│   recall: Number     │
│   f1Score: Number    │
│ }                    │
│ weightsUrl: String   │
│ createdBy: ObjectId  │
│ deployedAt: Date     │
│ createdAt: Date      │
└──────────────────────┘

┌──────────────────────┐
│    TrainingJob       │
│──────────────────────│
│ _id: ObjectId (PK)   │
│ jobId: String        │
│ modelVersion: String │
│ status: String       │
│ progress: Number     │
│ datasetInfo: Object  │
│ trainingConfig: Obj  │
│ metrics: Object      │
│ errorMessage: String │
│ createdBy: ObjectId  │
│ startedAt: Date      │
│ completedAt: Date    │
│ createdAt: Date      │
└──────────────────────┘

┌──────────────────────┐
│      ApiLog          │
│──────────────────────│
│ _id: ObjectId (PK)   │
│ service: String      │
│ endpoint: String     │
│ userId: ObjectId     │
│ inspectionId: ObjId  │
│ requestData: Object  │
│ responseTime: Number │
│ status: String       │
│ tokenUsage: Object   │
│ cost: Number         │
│ errorMessage: String │
│ timestamp: Date      │
└──────────────────────┘

┌──────────────────────┐
│     SystemLog        │
│──────────────────────│
│ _id: ObjectId (PK)   │
│ level: String        │
│ component: String    │
│ message: String      │
│ details: Object      │
│ userId: ObjectId     │
│ timestamp: Date      │
│ resolved: Boolean    │
└──────────────────────┘

Indexes:
- User: username (unique), email (unique)
- Inspection: userId + createdAt, status, defects.class
- Model: version (unique), status
- ApiLog: userId + timestamp, service + timestamp
- SystemLog: level + timestamp, component + timestamp
```


### 9. Request Lifecycle with Middleware

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REQUEST MIDDLEWARE PIPELINE                      │
└─────────────────────────────────────────────────────────────────────┘

                        Incoming HTTP Request
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  requestTimer          │
                    │  Attach: req._startTime│
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  requestId             │
                    │  Generate: req.id      │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  helmet()              │
                    │  Security headers      │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  cors()                │
                    │  CORS validation       │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  express.json()        │
                    │  Parse body            │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  sanitizeInput         │
                    │  XSS protection        │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  requestLogger         │
                    │  Log request           │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  apiLimiter            │
                    │  Rate limiting         │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Route Matching        │
                    │  /api/inspections      │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  authenticate          │
                    │  Verify JWT token      │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  authorize('role')     │
                    │  Check permissions     │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Route-specific        │
                    │  Validation            │
                    │  (paginationValidation)│
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Route Handler         │
                    │  Business logic        │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Response Sent         │
                    │  res.json(...)         │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Log Response          │
                    │  Duration calculation  │
                    └────────────────────────┘

Error Handling:
Any middleware can throw error → errorHandler middleware
- Catches all errors
- Formats consistent error response
- Logs error details
- Returns appropriate HTTP status
```


### 10. State Machine: Inspection Status

```
┌─────────────────────────────────────────────────────────────────────┐
│                  INSPECTION STATUS STATE MACHINE                    │
└─────────────────────────────────────────────────────────────────────┘

                        ┌─────────────┐
                        │   START     │
                        └──────┬──────┘
                               │
                               │ POST /upload
                               ▼
                        ┌─────────────┐
                   ┌────│  UPLOADED   │
                   │    └──────┬──────┘
                   │           │
                   │           │ POST /analyze
                   │           ▼
                   │    ┌─────────────┐
                   │    │ PROCESSING  │◀────┐
                   │    └──────┬──────┘     │
                   │           │            │
                   │           │ ML Service │ Retry
                   │           │ Callback   │
                   │           │            │
                   │    ┌──────┴──────┐     │
                   │    │             │     │
                   │    ▼             ▼     │
                   │ ┌──────────┐ ┌────────┴───┐
                   │ │COMPLETED │ │   FAILED   │
                   │ └────┬─────┘ └────┬───────┘
                   │      │            │
                   │      │            │ POST /analyze
                   │      │            │ (retry)
                   │      │            └────────────┘
                   │      │
                   │      │ POST /analyze
                   │      │ (re-analyze)
                   │      └────────────┘
                   │
                   │ DELETE /inspections/:id
                   │ (soft delete)
                   ▼
            ┌─────────────┐
            │   DELETED   │
            └─────────────┘

Status Descriptions:
- UPLOADED: Image uploaded, awaiting analysis
- PROCESSING: ML analysis in progress
- COMPLETED: Analysis successful, results available
- FAILED: Analysis failed, can retry
- DELETED: Soft deleted (not shown in listings)

Valid Transitions:
- UPLOADED → PROCESSING (trigger analysis)
- PROCESSING → COMPLETED (success)
- PROCESSING → FAILED (error)
- FAILED → PROCESSING (retry)
- COMPLETED → PROCESSING (re-analyze)
- Any → DELETED (soft delete)

Invalid Transitions:
- PROCESSING → UPLOADED (cannot revert)
- COMPLETED → UPLOADED (cannot revert)
- DELETED → Any (permanent)
```


---

## Quick Reference Tables

### HTTP Status Codes Used

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 OK | Success | GET requests, successful operations |
| 201 Created | Resource created | POST /register, POST /upload |
| 202 Accepted | Async processing started | POST /analyze |
| 400 Bad Request | Invalid input | Validation errors |
| 401 Unauthorized | Authentication failed | Invalid/expired token |
| 403 Forbidden | Insufficient permissions | Role check failed |
| 404 Not Found | Resource not found | Invalid ID |
| 429 Too Many Requests | Rate limit exceeded | Too many requests |
| 500 Internal Server Error | Server error | Unexpected errors |

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| AUTH_FAILED | 401 | Authentication failed |
| TOKEN_EXPIRED | 401 | JWT token expired |
| INVALID_TOKEN | 401 | Invalid JWT token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Input validation failed |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| UPLOAD_FAILED | 400 | File upload failed |
| ML_SERVICE_ERROR | 500 | ML service unavailable |
| SERVER_ERROR | 500 | Internal server error |

### Redis Key Patterns

| Key Pattern | TTL | Purpose | Example |
|-------------|-----|---------|---------|
| `session:{token}` | 24h | User sessions | `session:eyJhbGc...` |
| `blacklist:{token}` | 24h | Logged out tokens | `blacklist:eyJhbGc...` |
| `inspection:{id}` | 1h | Inspection results | `inspection:507f1f77...` |
| `model:weights:{version}` | ∞ | Model metadata | `model:weights:v1.0.0` |

### Defect Classes

| Class Name | Description |
|------------|-------------|
| damaged_rivet | Rivet showing signs of damage |
| missing_rivet | Rivet is missing from expected location |
| filiform_corrosion | Thread-like corrosion pattern |
| missing_panel | Panel is missing or detached |
| paint_detachment | Paint peeling or detaching |
| scratch | Surface scratch or abrasion |
| composite_damage | Damage to composite materials |
| random_damage | Unclassified damage |
| burn_mark | Evidence of burning or heat damage |
| scorch_mark | Scorch marks on surface |
| metal_fatigue | Signs of metal fatigue |
| crack | Crack in structure |

---

## Performance Benchmarks

### Typical Response Times

| Operation | Average Time | Notes |
|-----------|--------------|-------|
| Login | 150-300ms | With Redis cache |
| Upload Image | 500-1500ms | Depends on image size |
| Trigger Analysis | 50-100ms | Returns immediately (202) |
| ML Processing | 2000-5000ms | YOLO + GPT-Vision |
| Get Results (cached) | 10-50ms | Redis cache hit |
| Get Results (uncached) | 100-300ms | MongoDB query |
| Generate PDF Report | 500-2000ms | Depends on defect count |

### Cache Hit Rates (Expected)

| Cache Type | Expected Hit Rate | Impact |
|------------|-------------------|--------|
| Session Cache | 95%+ | Reduces DB queries by 95% |
| Inspection Cache | 60-80% | Faster result retrieval |
| Model Weights | 99%+ | Persistent cache |

---

## Related Documentation

- [Complete Dataflow Documentation](./DATAFLOW_AND_TOKEN_RESOLUTION.md)
- [API Documentation](../03-api-documentation/API_DOCUMENTATION.md)
- [Security Implementation](../04-security/SECURITY_IMPLEMENTATION.md)
- [Configuration Guide](../02-configuration/CONFIGURATION.md)
- [Testing Guide](../05-testing/INTEGRATION_TESTS_QUICK_START.md)
