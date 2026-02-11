# API Quick Reference Guide

## Base URL
```
http://localhost:3000
```

## Authentication
```bash
# All requests (except register/login) require:
Authorization: Bearer <jwt_token>
```

## Quick Start

### 1. Register & Login
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test@1234"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test@1234"}'
```

### 2. Upload & Analyze Image
```bash
# Upload
curl -X POST http://localhost:3000/api/inspections/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/image.jpg"

# Trigger Analysis
curl -X POST http://localhost:3000/api/inspections/INSPECTION_ID/analyze \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get Results
curl -X GET http://localhost:3000/api/inspections/INSPECTION_ID/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Generate Report
```bash
# JSON Report
curl -X GET "http://localhost:3000/api/inspections/INSPECTION_ID/report?format=json" \
  -H "Authorization: Bearer YOUR_TOKEN"

# PDF Report
curl -X GET "http://localhost:3000/api/inspections/INSPECTION_ID/report?format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output report.pdf
```

## Endpoint Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Authentication** |
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/verify` | Verify token | Yes |
| **Inspections** |
| POST | `/api/inspections/upload` | Upload images | Yes |
| GET | `/api/inspections` | Get history | Yes |
| GET | `/api/inspections/:id` | Get by ID | Yes |
| POST | `/api/inspections/:id/analyze` | Trigger analysis | Yes |
| GET | `/api/inspections/:id/results` | Get results | Yes |
| GET | `/api/inspections/:id/report` | Generate report | Yes |
| **Admin** |
| GET | `/api/admin/users` | List users | Admin |
| POST | `/api/admin/users` | Create user | Admin |
| PUT | `/api/admin/users/:id` | Update user | Admin |
| DELETE | `/api/admin/users/:id` | Deactivate user | Admin |
| GET | `/api/admin/models` | List models | Admin |
| GET | `/api/admin/monitoring/metrics` | Get metrics | Admin |
| GET | `/api/admin/monitoring/logs` | Get logs | Admin |

## Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Date Filtering
```
?startDate=2024-01-01&endDate=2024-12-31
```

### Status Filtering
```
?status=completed
```

### Defect Class Filtering
```
?defectClass=crack
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async operation) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Server Error |

## Defect Classes

1. crack
2. corrosion
3. dent
4. scratch
5. paint_damage
6. rivet_damage
7. panel_damage
8. seal_damage
9. fastener_damage
10. surface_contamination
11. delamination
12. other

## Rate Limits

- General API: 100 req/min
- Auth endpoints: 10 req/min

## Documentation Links

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json
- **Full Documentation**: See API_DOCUMENTATION.md
- **Postman Collection**: Import postman_collection.json

## Testing Tools

### Postman
1. Import `postman_collection.json`
2. Set `base_url` variable
3. Run "Login" request
4. Token auto-saves to collection variables

### cURL Examples
See API_DOCUMENTATION.md for detailed cURL examples

### Swagger UI
Visit http://localhost:3000/api-docs for interactive testing
