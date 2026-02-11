# Frontend Authentication Pages

This directory contains the frontend HTML pages for the Aircraft Defect Detection System.

## Pages Created

### 1. index.html
- Landing page with links to login and register
- Simple welcome interface

### 2. register.html
- User registration form with fields:
  - Username (3-30 characters, alphanumeric + underscore)
  - Email (valid email format)
  - Password (min 8 chars, uppercase, lowercase, digit, special character)
  - Confirm Password
- Features:
  - Real-time form validation
  - Password strength indicator (weak/medium/strong)
  - Bootstrap 5 responsive design
  - Password visibility toggle
  - Success/error message display
  - Automatic redirect to login on successful registration
- API Integration: POST /api/auth/register

### 3. login.html
- User login form with fields:
  - Username
  - Password
- Features:
  - Form validation
  - Remember me functionality
  - Password visibility toggle
  - Token storage in localStorage
  - Role-based redirect (user-dashboard.html or admin-dashboard.html)
  - Token verification on page load
  - Success/error message display
- API Integration: 
  - POST /api/auth/login
  - GET /api/auth/verify

## Technologies Used

- HTML5
- CSS3 (with custom styling)
- Bootstrap 5.3.2 (responsive UI framework)
- Bootstrap Icons 1.11.2
- Axios 1.6.5 (HTTP client)
- Vanilla JavaScript (ES6+)

## Features Implemented

### Registration Page (register.html)
✅ HTML form with username, email, password, confirmPassword fields
✅ Bootstrap 5 styling for responsive layout
✅ Client-side validation with JavaScript
✅ Password strength indicator
✅ Real-time validation feedback
✅ POST request to /api/auth/register using Axios
✅ Success/error response handling
✅ Redirect to login on success

### Login Page (login.html)
✅ HTML form with username and password fields
✅ Bootstrap 5 styling
✅ Form validation
✅ POST request to /api/auth/login using Axios
✅ JWT token storage in localStorage
✅ Role-based redirect (user-dashboard.html or admin-dashboard.html)
✅ Error message display for invalid credentials
✅ Token verification on page load
✅ Remember me functionality

## Server Configuration

The Express server has been configured to serve static files from the `public` directory:

```javascript
app.use(express.static('public'));
```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Access the application:
   - Landing page: http://localhost:3000/
   - Registration: http://localhost:3000/register.html
   - Login: http://localhost:3000/login.html

## Security Features

- Password complexity validation
- Client-side input sanitization
- HTTPS recommended for production
- JWT token-based authentication
- Token stored in localStorage
- Token verification before accessing protected pages
- Account lockout after failed login attempts (handled by backend)

## Next Steps

The following dashboard pages need to be created:
- user-dashboard.html (for regular users)
- admin-dashboard.html (for administrators)
- upload.html
- results.html
- history.html
- Admin management pages

## Requirements Satisfied

### Registration Page (Requirements 1.1, 1.4, 1.5, 1.8)
- ✅ 1.1: Display registration page with required fields
- ✅ 1.4: Enforce password complexity requirements
- ✅ 1.5: Validate password confirmation matches
- ✅ 1.8: Redirect to login page on successful registration

### Login Page (Requirements 2.1, 2.4, 2.6, 2.7)
- ✅ 2.1: Display login page with username and password fields
- ✅ 2.4: Display error message for invalid credentials
- ✅ 2.6: Redirect to user dashboard when role is User
- ✅ 2.7: Redirect to admin dashboard when role is Administrator
