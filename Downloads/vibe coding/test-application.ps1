# Application Test Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Aircraft Defect Detection - Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health Check
Write-Host "[Test 1] Backend Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is healthy" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "  Message: $($content.message)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Backend health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: ML Service Health Check
Write-Host "[Test 2] ML Service Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ ML Service is healthy" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "  Version: $($content.version)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ ML Service health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Frontend Accessibility
Write-Host "[Test 3] Frontend Accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing
    if ($response.StatusCode -eq 200 -and $response.Content -like "*Aircraft Defect Detection*") {
        Write-Host "✓ Frontend is accessible" -ForegroundColor Green
        Write-Host "  Landing page loads correctly" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Frontend accessibility failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: User Registration
Write-Host "[Test 4] User Registration..." -ForegroundColor Yellow
try {
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $username = "testuser$timestamp"
    $email = "test$timestamp@example.com"
    
    $body = @{
        username = $username
        email = $email
        password = "Test@1234"
        confirmPassword = "Test@1234"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/register" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -Headers @{Origin="http://localhost"}
    
    if ($response.StatusCode -eq 201) {
        Write-Host "✓ User registration successful" -ForegroundColor Green
        Write-Host "  Username: $username" -ForegroundColor Gray
        Write-Host "  Email: $email" -ForegroundColor Gray
        
        # Save credentials for login test
        $script:testUsername = $username
        $script:testPassword = "Test@1234"
    }
} catch {
    Write-Host "✗ User registration failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "  Error: $errorBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: User Login
if ($script:testUsername) {
    Write-Host "[Test 5] User Login..." -ForegroundColor Yellow
    try {
        $body = @{
            username = $script:testUsername
            password = $script:testPassword
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -Headers @{Origin="http://localhost"}
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ User login successful" -ForegroundColor Green
            $content = $response.Content | ConvertFrom-Json
            Write-Host "  Token received: Yes" -ForegroundColor Gray
            Write-Host "  User: $($content.user.username)" -ForegroundColor Gray
            
            # Save token for authenticated requests
            $script:authToken = $content.token
        }
    } catch {
        Write-Host "✗ User login failed: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 6: API Documentation
Write-Host "[Test 6] API Documentation..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api-docs.json" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API documentation is accessible" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "  API Title: $($content.info.title)" -ForegroundColor Gray
        Write-Host "  API Version: $($content.info.version)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ API documentation failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 7: MongoDB Connection
Write-Host "[Test 7] MongoDB Connection..." -ForegroundColor Yellow
try {
    $result = docker exec aircraft-detection-mongodb mongosh --eval "db.adminCommand('ping')" --quiet 2>&1
    if ($result -like "*ok*1*") {
        Write-Host "✓ MongoDB is connected and responding" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ MongoDB connection failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 8: Redis Connection
Write-Host "[Test 8] Redis Connection..." -ForegroundColor Yellow
try {
    $result = docker exec aircraft-detection-redis redis-cli -a redis123 ping 2>&1 | Select-String "PONG"
    if ($result) {
        Write-Host "✓ Redis is connected and responding" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Redis connection failed: $_" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All critical tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application at:" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost" -ForegroundColor White
Write-Host "  Backend:   http://localhost:3000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:3000/api-docs" -ForegroundColor White
Write-Host "  ML Service: http://localhost:5000" -ForegroundColor White
Write-Host ""
