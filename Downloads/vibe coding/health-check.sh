#!/bin/bash

# Health Check Script for Aircraft Defect Detection System
# Verifies all services are running and healthy

set -e

echo "=========================================="
echo "Aircraft Defect Detection System"
echo "Health Check"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service=$1
    local url=$2
    local name=$3
    
    echo -n "Checking $name... "
    
    if curl -f -s -o /dev/null "$url"; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

# Function to check Docker container status
check_container() {
    local container=$1
    local name=$2
    
    echo -n "Checking $name container... "
    
    if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
        echo -e "${GREEN}✓ Running${NC}"
        
        # Check health status if available
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        if [ "$health" != "none" ]; then
            if [ "$health" == "healthy" ]; then
                echo "  Health status: ${GREEN}$health${NC}"
            else
                echo "  Health status: ${YELLOW}$health${NC}"
            fi
        fi
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

echo "Docker Status:"
echo ""

# Check containers
check_container "aircraft-detection-frontend" "Frontend (Nginx)"
check_container "aircraft-detection-backend" "Backend (Node.js)"
check_container "aircraft-detection-ml" "ML Service (Python)"
check_container "aircraft-detection-mongodb" "MongoDB"
check_container "aircraft-detection-redis" "Redis"

echo ""
echo "Service Endpoints:"
echo ""

# Check service endpoints
check_service "frontend" "http://localhost/health" "Frontend"
check_service "backend" "http://localhost:3000/api/health" "Backend API"
check_service "ml-service" "http://localhost:5000/health" "ML Service"

echo ""
echo "Network Connectivity:"
echo ""

# Check if containers can communicate
echo -n "Backend → MongoDB... "
if docker exec aircraft-detection-backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => {console.log('ok'); process.exit(0)}).catch(() => process.exit(1))" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
fi

echo -n "Backend → Redis... "
if docker exec aircraft-detection-backend node -e "const redis = require('redis'); const client = redis.createClient({url: process.env.REDIS_URL}); client.connect().then(() => {console.log('ok'); process.exit(0)}).catch(() => process.exit(1))" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
fi

echo -n "Backend → ML Service... "
if docker exec aircraft-detection-backend node -e "require('http').get(process.env.ML_SERVICE_URL + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
fi

echo ""
echo "Volume Status:"
echo ""

# Check volumes
volumes=("mongodb_data" "redis_data" "backend_logs" "backend_uploads" "ml_models" "ml_cache")
for vol in "${volumes[@]}"; do
    echo -n "  $vol... "
    if docker volume inspect "aircraft-defect-detection_$vol" > /dev/null 2>&1; then
        size=$(docker system df -v | grep "$vol" | awk '{print $3}' || echo "unknown")
        echo -e "${GREEN}✓ Exists${NC} (Size: $size)"
    else
        echo -e "${YELLOW}⚠ Not found${NC}"
    fi
done

echo ""
echo "Resource Usage:"
echo ""

# Show resource usage
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep aircraft-detection || echo "No containers running"

echo ""
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="
echo ""

# Summary
if docker ps --filter "name=aircraft-detection" --filter "status=running" | grep -q "aircraft-detection"; then
    echo -e "${GREEN}✓ System is operational${NC}"
    echo ""
    echo "Access the application at: http://localhost"
    exit 0
else
    echo -e "${RED}✗ System has issues${NC}"
    echo ""
    echo "Run 'docker-compose logs' to view detailed logs"
    exit 1
fi
