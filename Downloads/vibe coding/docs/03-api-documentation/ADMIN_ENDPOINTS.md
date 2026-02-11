# Admin User Management Endpoints

This document describes the admin user management endpoints implemented for the Aircraft Defect Detection System.

## Overview

All admin endpoints require:
- Valid JWT token in the Authorization header
- User role must be "admin"

Base URL: `/api/admin`

## Authentication

All requests must include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Get All Users

**Endpoint:** `GET /api/admin/users`

**Description:** Retrieve a paginated list of all users with optional search and filtering.

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Number of users per page
- `search` (optional) - Search term to filter by username or email
- `role` (optional) - Filter by role ("user" or "admin")

**Example Request:**
```bash
GET /api/admin/users?page=1&limit=10&search=john&role=user
```

**Success Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5,
    "limit": 10
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not an admin
- `500 Internal Server Error` - Server error

---

### 2. Create New User

**Endpoint:** `POST /api/admin/users`

**Description:** Create a new user account with specified role.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "role": "user"
}
```

**Field Requirements:**
- `username` (required) - 3-30 characters, unique
- `email` (required) - Valid email format, unique
- `password` (required) - Minimum 8 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character (@$!%*?&)
- `role` (optional, default: "user") - Either "user" or "admin"

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "userId": "507f1f77bcf86cd799439011",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "newuser",
    "email": "newuser@example.com",
    "role": "user",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors:
  - `VALIDATION_ERROR` - Missing required fields
  - `INVALID_ROLE` - Invalid role value
  - `INVALID_USERNAME` - Username length invalid
  - `INVALID_EMAIL` - Invalid email format
  - `WEAK_PASSWORD` - Password doesn't meet complexity requirements
  - `USERNAME_EXISTS` - Username already registered
  - `EMAIL_EXISTS` - Email already registered
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not an admin
- `500 Internal Server Error` - Server error

---

### 3. Update User

**Endpoint:** `PUT /api/admin/users/:id`

**Description:** Update user's email, role, or status.

**URL Parameters:**
- `id` (required) - User ID (MongoDB ObjectId)

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "role": "admin",
  "status": "inactive"
}
```

**Fields (all optional, at least one required):**
- `email` - Valid email format, must be unique
- `role` - Either "user" or "admin"
- `status` - Either "active" or "inactive"

**Success Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "newemail@example.com",
    "role": "admin",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "timestamp": "2024-01-15T11:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors:
  - `INVALID_USER_ID` - Invalid user ID format
  - `INVALID_EMAIL` - Invalid email format
  - `EMAIL_EXISTS` - Email already taken by another user
  - `INVALID_ROLE` - Invalid role value
  - `INVALID_STATUS` - Invalid status value
  - `NO_UPDATES` - No valid fields provided
- `403 Forbidden` - `SELF_MODIFICATION_FORBIDDEN` - Cannot modify own role/status
- `404 Not Found` - `USER_NOT_FOUND` - User doesn't exist
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

### 4. Deactivate User

**Endpoint:** `DELETE /api/admin/users/:id`

**Description:** Deactivate a user account (sets status to "inactive").

**URL Parameters:**
- `id` (required) - User ID (MongoDB ObjectId)

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "status": "inactive"
  },
  "timestamp": "2024-01-15T11:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - `INVALID_USER_ID` - Invalid user ID format
- `403 Forbidden` - `SELF_DEACTIVATION_FORBIDDEN` - Cannot deactivate own account
- `404 Not Found` - `USER_NOT_FOUND` - User doesn't exist
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

## Security Features

### Authorization
- All endpoints require admin role
- Admins cannot modify their own role or status
- Admins cannot deactivate their own account

### Validation
- Role assignments validated (only "user" or "admin")
- Status changes validated (only "active" or "inactive")
- Email format validation
- Password complexity enforcement
- Username uniqueness check
- Email uniqueness check

### Logging
All admin actions are logged with:
- Admin username
- Action performed
- Target user
- Timestamp

---

## Example Usage

### Using cURL

**Get all users:**
```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Create a new user:**
```bash
curl -X POST "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "role": "user"
  }'
```

**Update user role:**
```bash
curl -X PUT "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

**Deactivate user:**
```bash
curl -X DELETE "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using JavaScript (Axios)

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const token = 'YOUR_JWT_TOKEN';

// Get all users
const getUsers = async () => {
  const response = await axios.get(`${API_BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { page: 1, limit: 10 }
  });
  return response.data;
};

// Create user
const createUser = async (userData) => {
  const response = await axios.post(`${API_BASE}/admin/users`, userData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Update user
const updateUser = async (userId, updates) => {
  const response = await axios.put(`${API_BASE}/admin/users/${userId}`, updates, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Deactivate user
const deactivateUser = async (userId) => {
  const response = await axios.delete(`${API_BASE}/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
```

---

## Testing

A test script is provided in `test-admin-endpoints.js`. To run the tests:

1. Start the server: `npm start`
2. Ensure MongoDB and Redis are running
3. Create an admin user (username: "admin", password: "Admin123!")
4. Run the test script: `node test-admin-endpoints.js`

The test script will verify:
- Admin login
- User creation
- User listing with pagination
- User search
- User role updates
- User status updates
- User deactivation
- Authorization (non-admin access denial)

---

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 10.7**: User management capabilities including creating, updating, and deactivating user accounts
- **Requirement 11.1**: Admin creates new user account with username, password, email, and role assignment
- **Requirement 11.2**: Support for two role types (User and Administrator) with distinct permission sets
- **Requirement 11.3**: Access control - users attempting to access admin-only features are denied
- **Requirement 11.5**: Deactivated user accounts immediately revoke access and prevent login attempts

---

## Notes

- User passwords are hashed using bcrypt with 10 salt rounds
- Deactivation is a soft delete (status set to "inactive")
- All responses include timestamps
- Error responses follow a consistent format
- Pagination defaults to 20 items per page
- Search is case-insensitive and searches both username and email fields
