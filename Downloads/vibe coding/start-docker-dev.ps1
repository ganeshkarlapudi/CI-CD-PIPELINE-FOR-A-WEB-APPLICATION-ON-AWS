Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Aircraft Defect Detection System" -ForegroundColor Cyan
Write-Host "Docker Development Environment Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking if Docker Desktop is running..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host ""
    Write-Host "Waiting for Docker Desktop to start (this may take 30-60 seconds)..." -ForegroundColor Yellow
    
    $maxAttempts = 24  # 2 minutes max
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 5
        try {
            docker info 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Docker Desktop is ready!" -ForegroundColor Green
                $dockerRunning = $true
                break
            }
        } catch {
            # Continue waiting
        }
        Write-Host "Still waiting for Docker..." -ForegroundColor Yellow
        $attempt++
    }
    
    if (-not $dockerRunning) {
        Write-Host "Docker Desktop failed to start within 2 minutes." -ForegroundColor Red
        Write-Host "Please start Docker Desktop manually and run this script again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Docker Desktop is already running!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting all services with Docker Compose..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services that will start:" -ForegroundColor Yellow
Write-Host "  - MongoDB (Database) on port 27017" -ForegroundColor White
Write-Host "  - Redis (Cache) on port 6379" -ForegroundColor White
Write-Host "  - Backend API on port 3000" -ForegroundColor White
Write-Host "  - ML Service on port 5000" -ForegroundColor White
Write-Host "  - Frontend on port 80" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Services stopped" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
