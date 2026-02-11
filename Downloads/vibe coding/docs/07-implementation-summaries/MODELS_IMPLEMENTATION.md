# MongoDB Models Implementation Summary

## Task 2: Implement MongoDB database models and connection

### ✅ Completed Components

#### 1. MongoDB Connection Utility (Already Existed)
- **File**: `src/config/database.js`
- **Features**:
  - Async connection with error handling
  - Connection pooling (max 100 connections)
  - Event listeners for errors and disconnections
  - Logging integration with Winston

#### 2. User Schema
- **File**: `src/models/User.js`
- **Fields**:
  - username (String, unique, indexed, 3-30 chars)
  - email (String, unique, indexed, validated format)
  - password (String, min 8 chars, bcrypt ready)
  - role (Enum: 'user', 'admin', default: 'user')
  - status (Enum: 'active', 'inactive', default: 'active', indexed)
  - failedLoginAttempts (Number, default: 0)
  - lockoutUntil (Date, nullable)
  - lastLogin (Date, nullable)
  - timestamps (createdAt, updatedAt)
- **Indexes**: username, email, status, createdAt
- **Methods**:
  - incrementLoginAttempts() - Handles account lockout after 5 attempts
  - resetLoginAttempts() - Resets on successful login
- **Virtuals**: isLocked - Checks if account is currently locked

#### 3. Inspection Schema
- **File**: `src/models/Inspection.js`
- **Fields**:
  - userId (ObjectId, ref: User, indexed)
  - imageUrl (String, required)
  - imageMetadata (Object with filename, size, format, dimensions, uploadedAt)
  - status (Enum: 'uploaded', 'processing', 'completed', 'failed', indexed)
  - defects (Array of embedded defect documents)
  - processingTime (Number, milliseconds)
  - modelVersion (String)
  - aircraftId (String, indexed)
  - notes (String, max 1000 chars)
  - errorMessage (String)
  - timestamps (createdAt, updatedAt)
- **Defect Sub-Schema**:
  - class (Enum: 12 defect types)
  - confidence (Number, 0-1)
  - bbox (Object: x, y, width, height)
  - source (Enum: 'yolo', 'gpt', 'ensemble')
- **Indexes**: userId+createdAt, status, createdAt, aircraftId+createdAt
- **Methods**:
  - getDefectsByClass(className)
  - getDefectsAboveThreshold(threshold)
- **Virtuals**: defectCount

#### 4. Model Schema (ML Model Versioning)
- **File**: `src/models/Model.js`
- **Fields**:
  - version (String, unique, indexed)
  - type (Enum: 'yolov8', 'ensemble')
  - status (Enum: 'training', 'validating', 'deployed', 'archived', indexed)
  - metrics (Object: mAP, precision, recall, f1Score, classMetrics[])
  - trainingConfig (Object: epochs, batchSize, learningRate, imageSize, augmentation)
  - datasetInfo (Object: totalImages, trainSplit, valSplit, classes[])
  - weightsUrl (String, S3 URL)
  - createdBy (ObjectId, ref: User)
  - deployedAt (Date)
  - timestamps (createdAt, updatedAt)
- **Indexes**: version, status, createdAt, metrics.mAP
- **Static Methods**:
  - archiveDeployed() - Archives current deployed models
  - getDeployed() - Gets latest deployed model
- **Virtuals**: isDeployable - Checks if mAP >= 0.95

#### 5. ApiLog Schema
- **File**: `src/models/ApiLog.js`
- **Fields**:
  - service (Enum: 'gpt-vision', 'yolo', 'ensemble', indexed)
  - endpoint (String)
  - userId (ObjectId, ref: User, indexed)
  - inspectionId (ObjectId, ref: Inspection, indexed)
  - requestData (Mixed)
  - responseTime (Number, milliseconds)
  - status (Enum: 'success', 'error', indexed)
  - errorMessage (String)
  - tokenUsage (Number, for GPT Vision)
  - cost (Number, for GPT Vision)
  - timestamp (Date, indexed)
- **Indexes**: service+timestamp, userId+timestamp, inspectionId, status+timestamp, timestamp
- **Static Methods**:
  - getTotalCost(startDate, endDate) - Aggregates total API costs
  - getUsageByService(startDate, endDate) - Groups usage by service

#### 6. SystemLog Schema
- **File**: `src/models/SystemLog.js`
- **Fields**:
  - level (Enum: 'info', 'warning', 'error', 'critical', indexed)
  - component (String, indexed)
  - message (String)
  - details (Mixed)
  - userId (ObjectId, ref: User)
  - timestamp (Date, indexed)
  - resolved (Boolean, default: false, indexed)
- **Indexes**: level+timestamp, component+timestamp, timestamp, resolved+level
- **Static Methods**:
  - getErrorCountByLevel(startDate, endDate) - Aggregates errors by level
  - getUnresolvedCritical() - Gets unresolved critical errors
  - markResolved(logIds) - Marks errors as resolved
  - getByComponent(component, limit) - Gets logs for specific component

#### 7. Models Index
- **File**: `src/models/index.js`
- Exports all models for easy importing

### Requirements Coverage

✅ **Requirement 1.6**: User data stored in MongoDB with encrypted passwords
✅ **Requirement 2.2**: Authentication against MongoDB User collection
✅ **Requirement 11.6**: User account data stored in User Collection with bcrypt encryption
✅ **Requirement 13.6**: Inspection records stored in Inspection Collection with indexed fields
✅ **Requirement 13.7**: Inspection data persisted with all required fields

### Schema Features Implemented

1. **Validation**: All required fields have validation rules
2. **Indexes**: Performance indexes on frequently queried fields
3. **Relationships**: Proper ObjectId references between collections
4. **Enums**: Type-safe enumeration for status fields
5. **Timestamps**: Automatic createdAt/updatedAt tracking
6. **Methods**: Helper methods for common operations
7. **Virtuals**: Computed properties for derived data
8. **Aggregations**: Static methods for complex queries

### Database Indexes Summary

- **User**: username, email, status, createdAt
- **Inspection**: userId+createdAt, status, createdAt, aircraftId+createdAt
- **Model**: version, status, createdAt, metrics.mAP
- **ApiLog**: service+timestamp, userId+timestamp, inspectionId, status+timestamp, timestamp
- **SystemLog**: level+timestamp, component+timestamp, timestamp, resolved+level

### Next Steps

The models are ready for use in subsequent tasks:
- Task 3: Authentication endpoints will use User model
- Task 7: Image upload will use Inspection model
- Task 13: Model management will use Model model
- Task 14: Monitoring will use ApiLog and SystemLog models
