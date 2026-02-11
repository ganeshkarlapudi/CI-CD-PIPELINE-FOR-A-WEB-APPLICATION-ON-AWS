@echo off
REM Aircraft Defect Detection System - Windows Startup Script

echo ==========================================
echo Aircraft Defect Detection System
echo Docker Deployment Script
echo ==========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed.
    echo Please install Docker Desktop from https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose is not installed.
    echo Please install Docker Compose or use Docker Desktop which includes it.
    pause
    exit /b 1
)

echo [OK] Docker and Docker Compose are installed
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found. Creating from .env.example...
    copy .env.example .env
    echo [OK] Created .env file
    echo.
    echo [IMPORTANT] Please edit .env and set the following:
    echo   - JWT_SECRET ^(use a strong random string^)
    echo   - OPENAI_API_KEY ^(your OpenAI API key^)
    echo   - MONGO_ROOT_PASSWORD ^(change default password^)
    echo   - REDIS_PASSWORD ^(change default password^)
    echo.
    pause
)

echo [OK] Environment file exists
echo.

REM Ask for deployment mode
echo Select deployment mode:
echo 1^) Production ^(recommended^)
echo 2^) Development ^(with hot-reloading^)
set /p mode="Enter choice [1-2]: "

if "%mode%"=="1" (
    echo.
    echo Starting in PRODUCTION mode...
    set COMPOSE_CMD=docker-compose up -d
) else if "%mode%"=="2" (
    echo.
    echo Starting in DEVELOPMENT mode...
    set COMPOSE_CMD=docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
) else (
    echo Invalid choice. Defaulting to production mode.
    set COMPOSE_CMD=docker-compose up -d
)

echo.
echo Building Docker images...
docker-compose build

echo.
echo Starting services...
%COMPOSE_CMD%

echo.
echo Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

REM Check service health
echo.
echo Service Status:
docker-compose ps

echo.
echo ==========================================
echo [OK] Deployment Complete!
echo ==========================================
echo.
echo Access the application:
echo   Frontend:   http://localhost
echo   Backend:    http://localhost:3000
echo   ML Service: http://localhost:5000
echo.
echo Useful commands:
echo   View logs:        docker-compose logs -f
echo   Stop services:    docker-compose down
echo   Restart services: docker-compose restart
echo.
echo For more information, see DOCKER.md
echo.
pause
