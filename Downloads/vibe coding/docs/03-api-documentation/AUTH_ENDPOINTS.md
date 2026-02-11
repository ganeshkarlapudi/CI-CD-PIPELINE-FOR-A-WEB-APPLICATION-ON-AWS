# Authentication Endpoints - Testing Guide

## Overview
This document provides examples for testing the authentication endpoints implemented in Task 3.

## Prerequisites
- MongoDB running on `mongodb://localhost:27017/aircraft_detection`
- Redis running on `redis://localhost:6379`
- Environment variables configured (copy `.env.example` to `.env` and update values)
- Server running: `npm start` or `npm run dev`

## Endpoints

### 1. User Registration
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "username": "testuser",
  "email": "testuser@example.com",
  "password": "Test@1234",
  "confirmPassword": "Test@1234"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "507f1f77bcf86cd799439011",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- 400: Username or email already exists
- 400: Validation errors (password complexity, email format, etc.)

### 2. User Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "username": "testuser",
  "password": "Test@1234"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "email": "testuser@example.com",
    "role": "user"
  },
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

**Error Responses:**
- 401: Invalid credentials
- 403: Account locked (after 5 failed attempts)
- 403: Account inactive

### 3. Verify Token
**GET** `/api/auth/verify`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "testuser",
    "role": "user"
  },
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

**Error Responses:**
- 401: No token provided
- 401: Invalid or expired token
- 401: Token blacklisted

### 4. User Logout
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "timestamp": "2024-01-15T10:45:00.000Z"
}
```

**Error Responses:**
- 401: No token provided
- 401: Invalid token

## Testing with cURL

### Register a new user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "Test@1234",
    "confirmPassword": "Test@1234"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test@1234"
  }'
```

### Verify token (replace TOKEN with actual token):
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer TOKEN"
```

### Logout (replace TOKEN with actual token):
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer TOKEN"
```

## Features Implemented

### Task 3.1 - User Registration Endpoint ✓
- POST /api/auth/register route
- Validation middleware for username, email, password format
- Password complexity validation (min 8 chars, uppercase, lowercase, digit, special char)
- bcrypt password hashing (10 salt rounds)
- User creation in MongoDB with default "user" role
- Success response with userId

### Task 3.2 - User Login Endpoint ✓
- POST /api/auth/login route
- Credential validation against MongoDB User collection
- bcrypt password comparison
- JWT token generation with 24-hour expiration
- Failed login attempt tracking
- Account lockout after 5 failed attempts (15-minute lockout)
- Response with token and user data (id, username, email, role)

### Task 3.3 - Authentication Middleware ✓
- JWT verification middleware
- Bearer token extraction from Authorization header
- Token decoding and user data attachment to request object
- Expired token error handling
- Role-based authorization middleware (user vs admin)
- Token blacklist checking via Redis

### Task 3.4 - Logout Endpoint ✓
- POST /api/auth/logout route
- Token invalidation via Redis blacklist
- 24-hour expiration on blacklisted tokens
- Success message response

## Security Features
- Password hashing with bcrypt (10 salt rounds)
- JWT tokens with 24-hour expiration
- Account lockout after 5 failed login attempts (15-minute duration)
- Token blacklisting on logout (stored in Redis)
- Role-based access control
- Input validation and sanitization
- Active/inactive account status checking

## Requirements Coverage
- ✓ Requirement 1.1: Registration page with required fields
- ✓ Requirement 1.2: Unique username validation
- ✓ Requirement 1.3: Valid email format validation
- ✓ Requirement 1.4: Password complexity enforcement
- ✓ Requirement 1.5: Password confirmation matching
- ✓ Requirement 1.6: Encrypted password storage (bcrypt)
- ✓ Requirement 1.7: Default "user" role assignment
- ✓ Requirement 2.1: Login page with credentials
- ✓ Requirement 2.2: Credential authentication against MongoDB
- ✓ Requirement 2.3: bcrypt password verification
- ✓ Requirement 2.4: Invalid credentials error handling
- ✓ Requirement 2.5: JWT token with 24-hour expiration
- ✓ Requirement 2.8: Account lockout after 5 failed attempts
- ✓ Requirement 3.1: Logout token invalidation
- ✓ Requirement 3.2: Logout success message
- ✓ Requirement 11.2: Role-based permissions (user vs admin)
- ✓ Requirement 11.3: Authorization error for admin-only features
