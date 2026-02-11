# Admin Logging Endpoints Implementation

## Overview
This document describes the implementation of the admin logging endpoints for the Aircraft Defect Detection System. The endpoint allows administrators to retrieve, filter, and paginate system logs.

## Endpoint Details

### GET /api/admin/monitoring/logs

**Description:** Fetch system logs from the systemLogs collection with pagination and filtering capabilities.

**Access:** Admin only (requires authentication and admin role)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number for pagination (min: 1) |
| limit | integer | No | 20 | Number of logs per page (min: 1, max: 100) |
| severity | string | No | - | Comma-separated severity levels to filter by (info, warning, error, critical) |
| startDate | string | No | - | Start date for filtering (ISO 8601 format: YYYY-MM-DD) |
| endDate | string | No | - | End date for filtering (ISO 8601 format: YYYY-MM-DD) |
| component | string | No | - | Filter by component name (case-insensitive partial match) |
| resolved | string | No | - | Filter by resolved status (true/false or 1/0) |

**Request Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "level": "error",
        "component": "authentication",
        "message": "Failed login attempt",
        "details": {
          "username": "testuser",
          "ip": "192.168.1.1"
        },
        "user": {
          "id": "507f1f77bcf86cd799439012",
          "username": "admin",
          "email": "admin@example.com"
        },
        "timestamp": "2025-11-14T10:30:00.000Z",
        "resolved": false
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "pages": 8,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "severity": "error,critical",
      "startDate": "2025-11-01",
      "endDate": "2025-11-14",
      "component": "auth",
      "resolved": false
    }
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

**Error Responses:**

**400 Bad Request - Invalid Pagination:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAGINATION",
    "message": "Page must be >= 1 and limit must be between 1 and 100"
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

**400 Bad Request - Invalid Severity:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SEVERITY",
    "message": "Invalid severity level(s): debug. Valid levels are: info, warning, error, critical"
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

**400 Bad Request - Invalid Date Format:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_START_DATE",
    "message": "Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)"
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

**400 Bad Request - Invalid Date Range:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "Start date must be before end date"
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "FETCH_LOGS_FAILED",
    "message": "Failed to fetch system logs",
    "details": "Database connection error"
  },
  "timestamp": "2025-11-14T10:35:00.000Z"
}
```

## Usage Examples

### Example 1: Get all logs (default pagination)
```bash
curl -X GET "http://localhost:3000/api/admin/monitoring/logs" \
  -H "Authorization: Bearer <admin_token>"
```

### Example 2: Get error and critical logs
```bash
curl -X GET "http://localhost:3000/api/admin/monitoring/logs?severity=error,critical" \
  -H "Authorization: Bearer <admin_token>"
```

### Example 3: Get logs for a specific date range
```bash
curl -X GET "http://localhost:3000/api/admin/monitoring/logs?startDate=2025-11-01&endDate=2025-11-14" \
  -H "Authorization: Bearer <admin_token>"
```

### Example 4: Get unresolved errors with pagination
```bash
curl -X GET "http://localhost:3000/api/admin/monitoring/logs?severity=error&resolved=false&page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

### Example 5: Get logs from authentication component
```bash
curl -X GET "http://localhost:3000/api/admin/monitoring/logs?component=auth" \
  -H "Authorization: Bearer <admin_token>"
```

### Example 6: Complex filtering
```bash
curl -X GET "http://localhost:3000/api/admin/monitoring/logs?severity=warning,error,critical&startDate=2025-11-01&endDate=2025-11-14&component=ml&resolved=false&page=1&limit=25" \
  -H "Authorization: Bearer <admin_token>"
```

## Implementation Details

### File Location
- **Route Handler:** `src/routes/admin.js`
- **Model:** `src/models/SystemLog.js`

### Key Features

1. **Pagination:**
   - Default: 20 logs per page
   - Maximum: 100 logs per page
   - Returns pagination metadata including total count, current page, total pages, and navigation flags

2. **Severity Filtering:**
   - Supports single or multiple severity levels
   - Valid levels: info, warning, error, critical
   - Comma-separated for multiple levels
   - Case-insensitive

3. **Date Range Filtering:**
   - Supports ISO 8601 date format (YYYY-MM-DD)
   - End date automatically set to end of day (23:59:59.999)
   - Validates date range (start must be before end)

4. **Component Filtering:**
   - Case-insensitive partial match
   - Uses MongoDB regex for flexible searching

5. **Resolved Status Filtering:**
   - Filter by resolved/unresolved logs
   - Accepts: true/false or 1/0

6. **Sorting:**
   - Logs are sorted by timestamp in descending order (newest first)

7. **User Population:**
   - Automatically populates user information (username, email) if userId is present
   - Returns null if no user is associated with the log

8. **Security:**
   - Requires authentication (JWT token)
   - Requires admin role authorization
   - Logs admin access for audit trail

### Database Indexes

The SystemLog model has the following indexes for optimal query performance:
- `level` (ascending) + `timestamp` (descending)
- `component` (ascending) + `timestamp` (descending)
- `timestamp` (descending)
- `resolved` (ascending) + `level` (ascending)

### Validation

The endpoint performs comprehensive validation:
- Pagination parameters (page >= 1, 1 <= limit <= 100)
- Severity levels (must be valid enum values)
- Date formats (ISO 8601)
- Date range logic (start before end)

### Error Handling

- All errors are logged using the Winston logger
- Detailed error messages in development mode
- Generic error messages in production mode
- Appropriate HTTP status codes for different error types

## Testing

### Manual Testing

Run the test script to verify all functionality:

```bash
node test-admin-endpoints.js
```

The test script includes the following logging endpoint tests:
1. Get system logs (default)
2. Get system logs with severity filter
3. Get system logs with date range
4. Get system logs with pagination
5. Get system logs with multiple filters

### Test Coverage

The implementation covers:
- ✅ Basic log retrieval with pagination
- ✅ Severity level filtering (single and multiple)
- ✅ Date range filtering
- ✅ Component filtering
- ✅ Resolved status filtering
- ✅ Combined filters
- ✅ Input validation
- ✅ Error handling
- ✅ Authentication and authorization
- ✅ User population

## Requirements Mapping

This implementation satisfies **Requirement 14.5** from the requirements document:

> **Requirement 14.5:** WHEN system errors occur, THE Detection System SHALL log error details and display them in the monitoring dashboard with severity levels

The endpoint provides:
- ✅ Retrieval of system logs with error details
- ✅ Filtering by severity levels (info, warning, error, critical)
- ✅ Pagination for efficient data display
- ✅ Date range filtering for historical analysis
- ✅ Component filtering for targeted debugging
- ✅ Resolved status tracking for issue management

## Integration with Frontend

The admin monitoring page (`public/admin-monitoring.html`) can integrate this endpoint to:
1. Display system logs in a table format
2. Provide filter controls for severity, date range, and component
3. Implement pagination controls
4. Show log details in expandable rows
5. Highlight critical and error logs with color coding
6. Provide search functionality
7. Allow marking logs as resolved

## Future Enhancements

Potential improvements for future iterations:
1. Real-time log streaming using WebSockets
2. Log export functionality (CSV, JSON)
3. Advanced search with full-text search
4. Log aggregation and analytics
5. Automated alert rules based on log patterns
6. Log retention policies
7. Bulk operations (mark multiple logs as resolved)
8. Log visualization with charts and graphs

## Conclusion

The admin logging endpoints implementation provides a robust and flexible system for retrieving and filtering system logs. It includes comprehensive validation, error handling, and security measures, making it production-ready for the Aircraft Defect Detection System.
