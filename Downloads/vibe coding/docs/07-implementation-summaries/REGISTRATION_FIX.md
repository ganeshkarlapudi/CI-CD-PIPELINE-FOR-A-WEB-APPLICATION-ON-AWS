# Registration Issue Fix

## Issue
User registration was failing with CORS error: "Not allowed by CORS"

## Root Cause
The CORS configuration in `src/middleware/security.js` only allowed requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

However, in the Docker deployment:
- **Frontend** is served by Nginx on **port 80** (`http://localhost`)
- **Backend API** runs on **port 3000** (`http://localhost:3000`)

When the frontend tried to make API calls to the backend, CORS blocked the requests because `http://localhost` (port 80) was not in the whitelist.

## Error Logs (Before Fix)
```
{"code":"INTERNAL_SERVER_ERROR","level":"error","message":"Not allowed by CORS",
"method":"POST","path":"/api/auth/register","statusCode":500}
```

## Solution
Updated the CORS whitelist in [`src/middleware/security.js`](file:///c:/Users/karla/Downloads/vibe%20coding/src/middleware/security.js#L140-L174) to include port 80:

```javascript
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost',        // For Nginx frontend on port 80
      'http://127.0.0.1',        // For Nginx frontend on port 80
      'http://localhost:80',     // Explicit port 80
      'http://127.0.0.1:80'      // Explicit port 80
    ];
```

## Verification
After rebuilding and restarting the backend container:

**Test Registration**:
```bash
POST http://localhost:3000/api/auth/register
Origin: http://localhost
```

**Success Response**:
```
{"level":"info","message":"New user registered: testuser123"}
POST /api/auth/register 201 102.62 ms
```

## Files Modified
- [`src/middleware/security.js`](file:///c:/Users/karla/Downloads/vibe%20coding/src/middleware/security.js) - Updated CORS whitelist

## Steps Taken
1. Identified CORS error in backend logs
2. Updated CORS configuration to include port 80
3. Rebuilt backend Docker image: `docker-compose build backend`
4. Restarted backend container: `docker-compose up -d backend`
5. Tested registration - **SUCCESS** ✅

## Result
✅ **Registration now works!**

Users can now:
- Register new accounts from http://localhost/register.html
- Login from http://localhost/login.html
- Access all API endpoints without CORS errors

## For Production
To configure CORS for production, set the `CORS_ALLOWED_ORIGINS` environment variable in `.env`:

```env
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

This will override the default localhost origins with your production domains.
