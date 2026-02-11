# Security Implementation Guide

This document describes the security measures implemented in the Aircraft Defect Detection System.

## Overview

The application implements multiple layers of security to protect against common web vulnerabilities and attacks:

1. **Input Validation** - Using express-validator
2. **Rate Limiting** - Preventing abuse and DDoS attacks
3. **CORS Configuration** - Whitelist-based origin control
4. **Security Headers** - Using Helmet.js
5. **XSS Protection** - Input sanitization
6. **File Upload Security** - Magic number validation

## 1. Input Validation

### Implementation

All API endpoints use `express-validator` middleware to validate and sanitize user inputs.

### Validation Rules

#### Authentication Endpoints
- **Registration**: Username (3-30 chars, alphanumeric), email format, password complexity (8+ chars, uppercase, lowercase, digit, special char)
- **Login**: Required username and password fields

#### Inspection Endpoints
- **ObjectId Validation**: All MongoDB IDs are validated
- **Pagination**: Page >= 1, Limit 1-100
- **Date Range**: ISO 8601 format, end date after start date
- **Defect Class**: Enum validation for 12 defect types
- **Status**: Enum validation (uploaded, processing, completed, failed)

#### Admin Endpoints
- **User Management**: Role (user/admin), status (active/inactive)
- **Search Queries**: Max 100 characters, XSS sanitized

### Usage Example

```javascript
const { validateObjectId, paginationValidation } = require('./middleware/validation');

router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  // Route handler
});
```

## 2. Rate Limiting

### Configuration

Two rate limiters are implemented:

#### API Rate Limiter
- **Window**: 1 minute (60,000 ms)
- **Max Requests**: 100 per window
- **Scope**: All `/api/*` routes
- **Key**: User ID (if authenticated) or IP address

#### Auth Rate Limiter
- **Window**: 15 minutes (900,000 ms)
- **Max Requests**: 10 per window
- **Scope**: `/api/auth/*` routes
- **Key**: IP address

### Response

When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Headers

Rate limit information is returned in response headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets

## 3. CORS Configuration

### Whitelist-Based Origin Control

CORS is configured with a whitelist of allowed origins from environment variables.

### Configuration

```javascript
// .env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://yourdomain.com
```

### Features
- Origin validation against whitelist
- Credentials support enabled
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Exposed headers for rate limiting info
- 24-hour preflight cache

### Development Mode

Set `CORS_ALLOWED_ORIGINS=*` to allow all origins during development (not recommended for production).

## 4. Security Headers (Helmet.js)

### Implemented Headers

#### Content Security Policy (CSP)
- `default-src`: 'self'
- `script-src`: 'self', 'unsafe-inline', CDN domains
- `style-src`: 'self', 'unsafe-inline', Bootstrap CDN
- `img-src`: 'self', data:, https:, blob:
- `object-src`: 'none'
- `frame-src`: 'none'

#### HTTP Strict Transport Security (HSTS)
- Max age: 1 year (31,536,000 seconds)
- Include subdomains: true
- Preload: true

#### Other Headers
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Cross-Origin-Resource-Policy**: cross-origin

## 5. XSS Protection

### Input Sanitization

All user inputs are sanitized to prevent XSS attacks:

```javascript
const { sanitizeInput } = require('./middleware/security');

app.use(sanitizeInput);
```

### Sanitization Process

1. **Body Parameters**: All request body fields
2. **Query Parameters**: All URL query strings
3. **URL Parameters**: All route parameters

### Character Escaping

Dangerous characters are escaped:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#x27;`
- `/` → `&#x2F;`

### Additional Protection

- `express-validator` escape() method on string inputs
- MongoDB query sanitization (prevents NoSQL injection)

## 6. File Upload Security

### Magic Number Validation

Files are validated using magic numbers (file signatures) to prevent file type spoofing.

### Supported File Types

| Type | Magic Number | Extensions |
|------|--------------|------------|
| JPEG | FF D8 FF | .jpg, .jpeg |
| PNG | 89 50 4E 47 0D 0A 1A 0A | .png |
| TIFF | 49 49 2A 00 / 4D 4D 00 2A | .tif, .tiff |

### Validation Checks

1. **Magic Number**: Verify file signature matches claimed MIME type
2. **Extension Match**: Ensure file extension matches MIME type
3. **Filename Security**: Reject files with path traversal characters (../, \)
4. **File Size**: Enforce 50MB maximum (configurable)
5. **Dimension Validation**: 640x640 to 4096x4096 pixels

### Usage

```javascript
const { validateUploadedFiles } = require('./middleware/fileValidation');

router.post('/upload', 
  authenticate, 
  upload.array('images', 10), 
  validateUploadedFiles, 
  async (req, res) => {
    // Route handler
  }
);
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILES",
    "message": "One or more files failed security validation",
    "details": [
      {
        "filename": "malicious.exe",
        "reason": "Invalid file signature. File type does not match content."
      }
    ]
  }
}
```

## Environment Variables

### Required Security Variables

```bash
# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=10

# File Upload
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/tiff
MIN_IMAGE_DIMENSION=640
MAX_IMAGE_DIMENSION=4096
```

## Security Best Practices

### Production Deployment

1. **Environment Variables**
   - Use strong JWT secrets (32+ characters)
   - Set `NODE_ENV=production`
   - Configure specific CORS origins (no wildcards)

2. **HTTPS/TLS**
   - Always use HTTPS in production
   - Enable HSTS headers
   - Use valid SSL certificates

3. **Database Security**
   - Use strong MongoDB credentials
   - Enable MongoDB authentication
   - Restrict database network access

4. **Redis Security**
   - Set Redis password
   - Disable dangerous commands
   - Use Redis ACLs if available

5. **API Keys**
   - Rotate OpenAI API keys regularly
   - Use separate keys for dev/staging/prod
   - Monitor API usage and costs

6. **Logging**
   - Log all security events
   - Monitor failed authentication attempts
   - Set up alerts for suspicious activity

### Regular Maintenance

- Update dependencies regularly (`npm audit`)
- Review security logs weekly
- Test rate limiting effectiveness
- Validate file upload security
- Review CORS configuration

## Testing Security

### Manual Testing

```bash
# Test rate limiting
for i in {1..110}; do curl http://localhost:3000/api/inspections; done

# Test CORS
curl -H "Origin: http://malicious-site.com" http://localhost:3000/api/inspections

# Test file upload with wrong type
curl -F "images=@malicious.exe" http://localhost:3000/api/inspections/upload

# Test XSS
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","email":"test@test.com","password":"Test123!"}'
```

### Automated Testing

Create security test suites:
- Input validation tests
- Rate limiting tests
- File upload security tests
- XSS prevention tests
- CORS policy tests

## Monitoring and Alerts

### Metrics to Monitor

1. **Rate Limit Violations**: Track IPs hitting rate limits
2. **Failed Authentication**: Monitor failed login attempts
3. **Invalid File Uploads**: Log rejected files
4. **CORS Violations**: Track blocked origins
5. **XSS Attempts**: Log sanitized malicious inputs

### Alert Thresholds

- 5+ failed logins from same IP in 5 minutes
- 10+ rate limit violations from same IP in 1 hour
- 3+ invalid file uploads from same user
- Any SQL/NoSQL injection attempts

## Compliance

This implementation helps meet security requirements for:
- OWASP Top 10 protection
- PCI DSS (if handling payment data)
- GDPR (data protection)
- SOC 2 (security controls)

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [express-validator Documentation](https://express-validator.github.io/docs/)
- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
