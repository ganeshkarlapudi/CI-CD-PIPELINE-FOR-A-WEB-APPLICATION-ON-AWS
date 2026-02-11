@echo off
REM Integration Test Runner for Windows
REM This script sets up the environment and runs integration tests

echo ========================================
echo Aircraft Defect Detection System
echo Integration Test Runner
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Checking Node.js version...
node --version
echo.

REM Check if MongoDB is running
echo [2/5] Checking MongoDB connection...
echo Attempting to connect to MongoDB at localhost:27017...
timeout /t 2 /nobreak >nul

REM Check if Redis is running (optional)
echo [3/5] Checking Redis connection (optional)...
echo If Redis is not running, some caching tests may be skipped
echo.

REM Install dependencies if needed
echo [4/5] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)
echo.

REM Set test environment variables
echo [5/5] Setting up test environment...
set NODE_ENV=test
set MONGODB_URI=mongodb://localhost:27017/aircraft-defect-test
set REDIS_HOST=localhost
set REDIS_PORT=6379
set JWT_SECRET=test-secret-key-for-integration-tests
set JWT_EXPIRATION=24h
set ML_SERVICE_URL=http://localhost:5000

echo Environment configured:
echo   NODE_ENV=%NODE_ENV%
echo   MONGODB_URI=%MONGODB_URI%
echo   REDIS_HOST=%REDIS_HOST%
echo.

echo ========================================
echo Running Integration Tests
echo ========================================
echo.

REM Run integration tests
call npm run test:integration

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Integration Tests PASSED!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Integration Tests FAILED!
    echo ========================================
    echo.
    echo Troubleshooting tips:
    echo 1. Ensure MongoDB is running on localhost:27017
    echo 2. Check that no other instance is using the test database
    echo 3. Verify all dependencies are installed
    echo 4. Review error messages above
    echo.
    echo For more help, see __tests__/INTEGRATION_TEST_GUIDE.md
)

echo.
pause
