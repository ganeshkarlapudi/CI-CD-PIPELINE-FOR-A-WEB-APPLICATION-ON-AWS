@echo off
echo ================================================
echo Aircraft Defect Detection - Quick Start
echo ================================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop first, then run this script again.
    echo.
    echo Steps:
    echo 1. Open Docker Desktop
    echo 2. Wait for it to fully start
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

echo Starting all services...
echo.
docker-compose up -d

echo.
echo Waiting for services to be healthy (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo Checking service status...
docker-compose ps

echo.
echo ================================================
echo Services Started!
echo ================================================
echo.
echo Access the application:
echo   Frontend:  http://localhost
echo   Backend:   http://localhost:3000
echo   Upload:    http://localhost/upload.html
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo.
pause
