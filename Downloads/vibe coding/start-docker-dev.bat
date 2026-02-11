@echo off
echo ========================================
echo Aircraft Defect Detection System
echo Docker Development Environment Startup
echo ========================================
echo.

echo Checking if Docker Desktop is running...
docker info >nul 2^>^&1
if errorlevel 1 (
    echo Docker Desktop is not running!
    echo.
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo.
    echo Waiting for Docker Desktop to start (this may take 30-60 seconds)...
    
    :wait_loop
    timeout /t 5 /nobreak >nul
    docker info >nul 2^>^&1
    if errorlevel 1 (
        echo Still waiting for Docker...
        goto wait_loop
    )
    echo Docker Desktop is ready!
) else (
    echo Docker Desktop is already running!
)

echo.
echo ========================================
echo Starting all services with Docker Compose...
echo ========================================
echo.
echo Services that will start:
echo   - MongoDB (Database) on port 27017
echo   - Redis (Cache) on port 6379
echo   - Backend API on port 3000
echo   - ML Service on port 5000
echo   - Frontend on port 80
echo.
echo Press Ctrl+C to stop all services
echo.

docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

echo.
echo ========================================
echo Services stopped
echo ========================================
