# Error Handling and Logging Guide

## Overview

This document describes the comprehensive error handling and logging system implemented for the Aircraft Defect Detection application. The system provides centralized error handling, structured logging, and user-friendly error messages across both backend and frontend.

## Backend Error Handling

### Error Classes

The system provides custom error classes for different error scenarios:

```javascript
const {
  AppError,              // Base error class
  ValidationError,       // 400 - Input validation errors
  AuthenticationError,   // 401 - Authentication failures
  AuthorizationError,    // 403 - Permission denied
  NotFoundError,         // 404 - Resource not found
  ConflictError,         // 409 - Resource conflicts
  MLProcessingError,     // 500 - ML inference errors
  DatabaseError,         // 500 - Database operation errors
  ExternalServiceError,  // 503 - External service failures
} = require('./middleware');
```

### Using Error Classes in Routes

```javascript
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware');

// Wrap async route handlers with asyncHandler
router.get('/inspections/:id', asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  
  if (!inspection) {
    throw new NotFoundError('Inspection not found');
  }
  
  if (!inspection.userId.equals(req.user.userId)) {
    throw new AuthorizationError('You do not have permission to view this inspection');
  }
  
  res.json({ success: true, data: inspection });
}));
```

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "details": {} // Optional, only in development mode
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Automatic Error Handling

The system automatically handles common errors:

- **Mongoose Validation Errors**: Converted to ValidationError with field details
- **Duplicate Key Errors**: Converted to ConflictError
- **Cast Errors**: Converted to ValidationError
- **JWT Errors**: Converted to AuthenticationError
- **Multer Errors**: Converted to ValidationError with file-specific messages

## Logging System

### Winston Logger

The application uses Winston for structured logging with multiple transports:

#### Log Levels

- `error`: Error events that might still allow the application to continue
- `warn`: Warning events that indicate potential issues
- `info`: Informational messages about application progress
- `debug`: Detailed debugging information (development only)

#### Log Files

- `logs/error.log`: Error-level logs only
- `logs/combined.log`: All log levels
- `logs/warnings.log`: Warning-level logs
- `logs/exceptions.log`: Uncaught exceptions
- `logs/rejections.log`: Unhandled promise rejections

#### Using the Logger

```javascript
const logger = require('./config/logger');

// Basic logging
logger.info('User logged in', { userId: user.id, username: user.username });
logger.warn('API rate limit approaching', { userId, currentRate: 95 });
logger.error('Database connection failed', { error: err.message });

// Helper methods
logger.logRequest(req, 'Custom message');
logger.logResponse(req, res, duration);
logger.logError(error, req, { additionalInfo: 'value' });
```

### Request Logging

The system logs all HTTP requests with detailed information:

```javascript
// Automatic request logging with Morgan
// Format: METHOD URL STATUS DURATION - USER_ID - IP - USER_AGENT
```

### Database Logging

Errors are automatically logged to the `systemLogs` MongoDB collection:

```javascript
{
  level: 'error',           // info, warning, error, critical
  component: 'auth',        // Component that generated the log
  message: 'Login failed',
  details: {
    code: 'INVALID_CREDENTIALS',
    statusCode: 401,
    path: '/api/auth/login',
    method: 'POST',
    ip: '192.168.1.1',
    stack: '...'
  },
  userId: ObjectId('...'),
  timestamp: Date,
  resolved: false
}
```

## Frontend Error Handling

### Error Handler Class

The frontend includes a global error handler that provides user-friendly error messages:

```javascript
// Include in your HTML pages
<script src="/js/errorHandler.js"></script>

// Usage
errorHandler.showError('Error message', 'error');
errorHandler.showSuccess('Success message');
errorHandler.showWarning('Warning message');
errorHandler.showInfo('Info message');

// Handle API errors
try {
  const response = await axios.post('/api/endpoint', data);
} catch (error) {
  errorHandler.handleApiError(error);
}
```

### Form Validation

```javascript
const validationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    label: 'Username'
  },
  email: {
    required: true,
    pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    patternMessage: 'Please enter a valid email address',
    label: 'Email'
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value),
    customMessage: 'Password must contain uppercase, lowercase, digit, and special character',
    label: 'Password'
  }
};

const form = document.getElementById('myForm');
if (errorHandler.validateForm(form, validationRules)) {
  // Form is valid, submit
}
```

### Global Error Handlers

The error handler automatically catches:

- Uncaught JavaScript errors
- Unhandled promise rejections
- Network errors
- API errors

### Error Logging to Backend

Frontend errors are automatically logged to the backend:

```javascript
// Automatic logging (no action needed)
// Errors are sent to POST /api/admin/monitoring/logs/client
```

## Error Codes Reference

### Authentication Errors (401)

- `AUTH_FAILED`: Authentication failed
- `INVALID_CREDENTIALS`: Invalid username or password
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_TOKEN`: JWT token is invalid

### Authorization Errors (403)

- `FORBIDDEN`: Insufficient permissions
- `ACCOUNT_LOCKED`: Account locked due to failed login attempts
- `ACCOUNT_INACTIVE`: Account has been deactivated

### Validation Errors (400)

- `VALIDATION_ERROR`: Input validation failed
- `INVALID_FILE`: Invalid file format
- `FILE_TOO_LARGE`: File exceeds size limit
- `WEAK_PASSWORD`: Password doesn't meet complexity requirements
- `INVALID_EMAIL`: Email format is invalid

### Resource Errors (404, 409)

- `NOT_FOUND`: Resource not found
- `USERNAME_EXISTS`: Username already registered
- `EMAIL_EXISTS`: Email already registered
- `CONFLICT`: Resource conflict

### Server Errors (500, 503)

- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `DATABASE_ERROR`: Database operation failed
- `ML_ERROR`: ML processing failed
- `EXTERNAL_SERVICE_ERROR`: External service unavailable

## Monitoring and Debugging

### View System Logs

Admin users can view system logs through the monitoring dashboard:

```
GET /api/admin/monitoring/logs
Query Parameters:
  - page: Page number (default: 1)
  - limit: Items per page (default: 20, max: 100)
  - severity: Filter by level (info, warning, error, critical)
  - startDate: Filter by start date (ISO 8601)
  - endDate: Filter by end date (ISO 8601)
  - component: Filter by component name
  - resolved: Filter by resolved status (true/false)
```

### View Metrics

```
GET /api/admin/monitoring/metrics
Query Parameters:
  - startDate: Start date for metrics (ISO 8601)
  - endDate: End date for metrics (ISO 8601)
```

### Log Files

Log files are stored in the `logs/` directory with automatic rotation:

- Maximum file size: 5MB
- Maximum files: 3-5 per log type
- Older logs are automatically archived

## Best Practices

### Backend

1. **Always use asyncHandler** for async route handlers
2. **Throw specific error classes** instead of generic errors
3. **Include context** in error messages
4. **Log errors** before throwing them for critical operations
5. **Don't expose sensitive information** in error messages

```javascript
// Good
router.post('/endpoint', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  // ... rest of logic
}));

// Bad
router.post('/endpoint', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend

1. **Always handle API errors** with errorHandler.handleApiError()
2. **Validate forms** before submission
3. **Show user-friendly messages** instead of technical errors
4. **Clear errors** when appropriate
5. **Don't show multiple errors** for the same issue

```javascript
// Good
try {
  const response = await axios.post('/api/endpoint', data);
  errorHandler.showSuccess('Operation completed successfully');
} catch (error) {
  errorHandler.handleApiError(error);
}

// Bad
try {
  const response = await axios.post('/api/endpoint', data);
  alert('Success!');
} catch (error) {
  alert('Error: ' + error.message);
}
```

## Testing Error Handling

### Test Error Responses

```javascript
// Test with Jest/Supertest
describe('Error Handling', () => {
  it('should return 404 for non-existent resource', async () => {
    const response = await request(app)
      .get('/api/inspections/invalid-id')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
```

### Test Logging

```javascript
// Verify logs are created
const logCount = await SystemLog.countDocuments({
  level: 'error',
  component: 'auth',
});
expect(logCount).toBeGreaterThan(0);
```

## Environment Variables

```env
# Logging
LOG_LEVEL=debug              # Log level (debug, info, warn, error)
NODE_ENV=development         # Environment (development, production)

# Error Handling
SHOW_ERROR_STACK=true        # Show stack traces in development
```

## Troubleshooting

### Logs Not Appearing

1. Check that the `logs/` directory exists and is writable
2. Verify LOG_LEVEL environment variable
3. Check Winston transports configuration

### Frontend Errors Not Logged

1. Verify user is authenticated (token in localStorage)
2. Check browser console for network errors
3. Verify endpoint `/api/admin/monitoring/logs/client` is accessible

### Database Logging Fails

1. Check MongoDB connection
2. Verify SystemLog model is properly defined
3. Check for schema validation errors

## Summary

The error handling and logging system provides:

- ✅ Centralized error handling with custom error classes
- ✅ Structured logging with Winston (file + console)
- ✅ Database logging for system errors
- ✅ Frontend error handling with user-friendly messages
- ✅ Automatic error logging from frontend to backend
- ✅ Comprehensive monitoring and debugging tools
- ✅ Consistent error response format
- ✅ Global error handlers for uncaught errors
