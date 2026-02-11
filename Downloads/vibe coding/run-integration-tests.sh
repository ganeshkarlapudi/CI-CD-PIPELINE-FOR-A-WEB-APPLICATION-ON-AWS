#!/bin/bash
# Integration Test Runner for Linux/Mac
# This script sets up the environment and runs integration tests

echo "========================================"
echo "Aircraft Defect Detection System"
echo "Integration Test Runner"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/5] Checking Node.js version..."
node --version
echo ""

# Check if MongoDB is running
echo "[2/5] Checking MongoDB connection..."
echo "Attempting to connect to MongoDB at localhost:27017..."
if command -v mongosh &> /dev/null; then
    mongosh --eval "db.version()" --quiet mongodb://localhost:27017 &> /dev/null
    if [ $? -eq 0 ]; then
        echo "✓ MongoDB is running"
    else
        echo "⚠ Warning: Cannot connect to MongoDB"
        echo "  Please ensure MongoDB is running on localhost:27017"
        echo "  Or update MONGODB_URI in the script"
    fi
else
    echo "⚠ mongosh not found, skipping MongoDB check"
fi
echo ""

# Check if Redis is running (optional)
echo "[3/5] Checking Redis connection (optional)..."
if command -v redis-cli &> /dev/null; then
    redis-cli ping &> /dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Redis is running"
    else
        echo "⚠ Warning: Redis is not running"
        echo "  Some caching tests may be skipped"
    fi
else
    echo "⚠ redis-cli not found, skipping Redis check"
fi
echo ""

# Install dependencies if needed
echo "[4/5] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
else
    echo "✓ Dependencies already installed"
fi
echo ""

# Set test environment variables
echo "[5/5] Setting up test environment..."
export NODE_ENV=test
export MONGODB_URI=mongodb://localhost:27017/aircraft-defect-test
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=test-secret-key-for-integration-tests
export JWT_EXPIRATION=24h
export ML_SERVICE_URL=http://localhost:5000

echo "Environment configured:"
echo "  NODE_ENV=$NODE_ENV"
echo "  MONGODB_URI=$MONGODB_URI"
echo "  REDIS_HOST=$REDIS_HOST"
echo ""

echo "========================================"
echo "Running Integration Tests"
echo "========================================"
echo ""

# Run integration tests
npm run test:integration

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✓ Integration Tests PASSED!"
    echo "========================================"
    exit 0
else
    echo ""
    echo "========================================"
    echo "✗ Integration Tests FAILED!"
    echo "========================================"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Ensure MongoDB is running on localhost:27017"
    echo "2. Check that no other instance is using the test database"
    echo "3. Verify all dependencies are installed"
    echo "4. Review error messages above"
    echo ""
    echo "For more help, see __tests__/INTEGRATION_TEST_GUIDE.md"
    exit 1
fi
