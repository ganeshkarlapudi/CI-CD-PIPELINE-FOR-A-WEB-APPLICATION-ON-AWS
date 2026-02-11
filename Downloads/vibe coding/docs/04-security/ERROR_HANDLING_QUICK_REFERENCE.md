# Error Handling Quick Reference

## Backend - Throwing Errors

```javascript
const { 
  asyncHandler, 
  NotFoundError, 
  ValidationError,
  AuthenticationError,
  AuthorizationError 
} = require('../middleware');

// Wrap async handlers
router.get('/resource/:id', asyncHandler(async (req, res) => {
  const resource = await Model.findById(req.params.id);
  
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }
  
  if (!resource.userId.equals(req.user.userId)) {
    throw new AuthorizationError('Access denied');
  }
  
  res.json({ success: true, data: resource });
}));
```

## Backend - Logging

```javascript
const logger = require('./config/logger');

// Basic logging
logger.info('User action', { userId, action: 'login' });
logger.warn('Rate limit approaching', { userId, rate: 95 });
logger.error('Operation failed', { error: err.message });

// Helper methods
logger.logRequest(req);
logger.logError(error, req, { context: 'additional info' });
```

## Frontend - Error Handling

```javascript
// Include in HTML
<script src="/js/errorHandler.js"></script>

// Show messages
errorHandler.showError('Error message');
errorHandler.showSuccess('Success message');
errorHandler.showWarning('Warning message');

// Handle API errors
try {
  const response = await axios.post('/api/endpoint', data);
  errorHandler.showSuccess('Success!');
} catch (error) {
  errorHandler.handleApiError(error);
}

// Validate forms
const rules = {
  email: {
    required: true,
    pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    label: 'Email'
  }
};

if (errorHandler.validateForm(form, rules)) {
  // Submit form
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| AUTH_FAILED | 401 | Authentication failed |
| INVALID_CREDENTIALS | 401 | Invalid username/password |
| TOKEN_EXPIRED | 401 | JWT token expired |
| FORBIDDEN | 403 | Insufficient permissions |
| ACCOUNT_LOCKED | 403 | Account locked |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Input validation failed |
| CONFLICT | 409 | Resource conflict |
| ML_ERROR | 500 | ML processing failed |
| DATABASE_ERROR | 500 | Database operation failed |
| INTERNAL_SERVER_ERROR | 500 | Unexpected error |

## Monitoring

### View Logs (Admin)
```
GET /api/admin/monitoring/logs
?page=1&limit=20&severity=error&startDate=2024-01-01
```

### View Metrics (Admin)
```
GET /api/admin/monitoring/metrics
?startDate=2024-01-01&endDate=2024-01-31
```

### Log Frontend Errors
```
POST /api/admin/monitoring/logs/client
{
  "level": "error",
  "component": "frontend",
  "message": "Error message",
  "details": {}
}
```

## Log Files

- `logs/combined.log` - All logs
- `logs/error.log` - Errors only
- `logs/warnings.log` - Warnings only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled rejections

## Testing

### Backend
```bash
node test-error-handling.js
```

### Frontend
Visit: `http://localhost:3000/test-error-handler.html`

## Best Practices

✅ Always use `asyncHandler` for async routes  
✅ Throw specific error classes, not generic errors  
✅ Use `errorHandler.handleApiError()` in frontend  
✅ Include context in log messages  
✅ Don't expose sensitive data in errors  
✅ Validate input before processing  
✅ Log errors before throwing them  
✅ Clear errors when appropriate  

## Common Patterns

### Protected Route
```javascript
router.get('/protected', authenticate, authorize('admin'), 
  asyncHandler(async (req, res) => {
    // Route logic
  })
);
```

### File Upload Error
```javascript
if (!req.file) {
  throw new ValidationError('No file uploaded');
}

if (req.file.size > 50 * 1024 * 1024) {
  throw new ValidationError('File too large (max 50MB)');
}
```

### Database Error
```javascript
try {
  await model.save();
} catch (error) {
  if (error.code === 11000) {
    throw new ConflictError('Resource already exists');
  }
  throw new DatabaseError('Failed to save resource');
}
```

### External Service Error
```javascript
try {
  const response = await axios.post(externalApi, data);
} catch (error) {
  throw new ExternalServiceError(
    'External service unavailable',
    'service-name'
  );
}
```
