# Aircraft Defect Detection API Documentation

## Overview
The Aircraft Defect Detection API provides endpoints for managing aircraft inspection images, detecting defects using AI models (YOLOv8 and GPT Vision), and generating inspection reports.

## Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.aircraft-defect-detection.com`

## Interactive Documentation
Access the interactive Swagger UI documentation at:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token
1. Register a new user or login with existing credentials
2. Use the returned JWT token for subsequent requests
3. Token expires after 24 hours

---

## Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "507f1f77bcf86cd799439011",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### POST /api/auth/login
Login with username and password.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account locked or inactive

---

#### POST /api/auth/logout
Logout and invalidate the current token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET /api/auth/verify
Verify if the current token is valid.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "role": "user"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Inspection Endpoints

#### POST /api/inspections/upload
Upload aircraft inspection images for analysis.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `images`: File(s) - Up to 10 images
- Supported formats: JPEG, PNG, TIFF
- Maximum file size: 50MB per image

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "inspections": [
      {
        "inspectionId": "507f1f77bcf86cd799439011",
        "filename": "aircraft-wing.jpg",
        "qualityScore": 85
      }
    ],
    "totalUploaded": 1,
    "totalFailed": 0
  },
  "message": "Successfully uploaded 1 image(s)",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET /api/inspections
Get inspection history with filtering and pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `defectClass` (optional): Filter by defect type
- `status` (optional): Filter by status (uploaded, processing, completed, failed)

**Example:**
```
GET /api/inspections?page=1&limit=20&status=completed&startDate=2024-01-01
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "inspections": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "507f1f77bcf86cd799439011",
        "imageUrl": "https://s3.amazonaws.com/bucket/image.jpg",
        "status": "completed",
        "defects": [...],
        "processingTime": 1500,
        "modelVersion": "v1.0.0",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "pages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET /api/inspections/:id
Get a specific inspection by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439011",
    "imageUrl": "https://s3.amazonaws.com/bucket/image.jpg",
    "status": "completed",
    "defects": [
      {
        "class": "crack",
        "confidence": 0.95,
        "bbox": {
          "x": 100,
          "y": 150,
          "width": 50,
          "height": 75
        },
        "source": "ensemble"
      }
    ],
    "processingTime": 1500,
    "modelVersion": "v1.0.0",
    "imageMetadata": {
      "filename": "aircraft-wing.jpg",
      "size": 1024000,
      "format": "jpeg",
      "dimensions": {
        "width": 1920,
        "height": 1080
      }
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:31:30.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### POST /api/inspections/:id/analyze
Trigger ML analysis for an uploaded inspection.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "inspectionId": "507f1f77bcf86cd799439011",
    "status": "processing",
    "message": "Analysis started. Check back for results."
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET /api/inspections/:id/results
Get inspection results with defects and analysis data.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "inspectionId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439011",
    "status": "completed",
    "imageUrl": "https://s3.amazonaws.com/bucket/image.jpg",
    "defects": [
      {
        "class": "crack",
        "confidence": 0.95,
        "bbox": { "x": 100, "y": 150, "width": 50, "height": 75 },
        "source": "ensemble"
      },
      {
        "class": "corrosion",
        "confidence": 0.88,
        "bbox": { "x": 200, "y": 250, "width": 60, "height": 80 },
        "source": "yolo"
      }
    ],
    "processingTime": 1500,
    "modelVersion": "v1.0.0",
    "defectCount": 2,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:31:30.000Z"
  },
  "cached": false,
  "timestamp": "2024-01-15T10:32:00.000Z"
}
```

**Status-Specific Responses:**
- `processing`: Analysis in progress
- `failed`: Analysis failed with error message
- `uploaded`: Not yet analyzed

---

#### GET /api/inspections/:id/report
Generate and export inspection report.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `format`: Report format (`json` or `pdf`)

**Example:**
```
GET /api/inspections/507f1f77bcf86cd799439011/report?format=json
```

**JSON Response (200 OK):**
```json
{
  "metadata": {
    "reportId": "507f1f77bcf86cd799439011",
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "inspectionDate": "2024-01-15T10:30:00.000Z",
    "aircraftId": "N/A",
    "modelVersion": "v1.0.0",
    "processingTime": 1500
  },
  "image": {
    "url": "https://s3.amazonaws.com/bucket/image.jpg",
    "filename": "aircraft-wing.jpg",
    "dimensions": { "width": 1920, "height": 1080 },
    "format": "jpeg"
  },
  "summary": {
    "totalDefects": 2,
    "defectsByClass": [
      { "class": "crack", "count": 1, "avgConfidence": 0.95 },
      { "class": "corrosion", "count": 1, "avgConfidence": 0.88 }
    ]
  },
  "defects": [...]
}
```

**PDF Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="inspection-report-{id}.pdf"`

---

### Admin Endpoints

All admin endpoints require admin role authentication.

#### GET /api/admin/users
Get all users with pagination and search.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by username or email

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "user",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### POST /api/admin/users
Create a new user (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "role": "user"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "userId": "507f1f77bcf86cd799439011",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### PUT /api/admin/users/:id
Update user role or status.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "role": "admin",
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### DELETE /api/admin/users/:id
Deactivate a user account.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET /api/admin/models
Get all ML model versions.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "version": "v1.0.0",
        "mAP": 0.96,
        "status": "deployed",
        "trainingDate": "2024-01-10T10:00:00.000Z",
        "deploymentDate": "2024-01-12T10:00:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET /api/admin/monitoring/metrics
Get system metrics and statistics.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `startDate` (optional): Filter start date
- `endDate` (optional): Filter end date

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalInspections": 1500,
    "avgProcessingTime": 1800,
    "totalDefects": 4500,
    "activeUsers": 75,
    "apiCosts": 125.50,
    "errorCount": 12
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### GET /api/admin/monitoring/logs
Get system logs with filtering.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `level` (optional): Log level (info, warning, error, critical)
- `startDate` (optional): Filter start date
- `endDate` (optional): Filter end date

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "level": "error",
        "message": "Database connection failed",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "metadata": {}
      }
    ],
    "pagination": {
      "total": 500,
      "page": 1,
      "limit": 20,
      "pages": 25
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_FAILED` | 401 | Authentication failed or token invalid |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `INVALID_TOKEN` | 401 | JWT token is malformed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `ACCOUNT_LOCKED` | 403 | Account locked due to failed login attempts |
| `ACCOUNT_INACTIVE` | 403 | Account has been deactivated |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_STATUS` | 400 | Invalid operation for current status |
| `USERNAME_EXISTS` | 400 | Username already registered |
| `EMAIL_EXISTS` | 400 | Email already registered |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General API**: 100 requests per minute per user
- **Auth endpoints**: 10 requests per minute per IP

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

---

## Defect Classes

The system can detect the following defect types:

1. **crack** - Surface cracks
2. **corrosion** - Corrosion damage
3. **dent** - Dents and deformations
4. **scratch** - Surface scratches
5. **paint_damage** - Paint peeling or damage
6. **rivet_damage** - Damaged rivets
7. **panel_damage** - Panel structural damage
8. **seal_damage** - Seal deterioration
9. **fastener_damage** - Damaged fasteners
10. **surface_contamination** - Surface contamination
11. **delamination** - Material delamination
12. **other** - Other defects

---

## Best Practices

1. **Authentication**: Always include the JWT token in the Authorization header
2. **Error Handling**: Check the `success` field in responses
3. **Pagination**: Use pagination for large datasets
4. **File Uploads**: Validate file types and sizes before uploading
5. **Rate Limiting**: Implement exponential backoff for rate limit errors
6. **Caching**: Results are cached for 1 hour; use cache headers appropriately

---

## Support

For API support or questions:
- Email: support@aircraft-defect-detection.com
- Documentation: http://localhost:3000/api-docs
- GitHub: https://github.com/your-org/aircraft-defect-detection
