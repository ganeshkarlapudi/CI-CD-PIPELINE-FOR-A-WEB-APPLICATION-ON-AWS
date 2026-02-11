# Integration Tests - Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js installed (v14+)
- [ ] MongoDB running on `localhost:27017`
- [ ] Redis running on `localhost:6379` (optional)
- [ ] Dependencies installed (`npm install`)

## Quick Start

### Option 1: Automated Script (Recommended)

**Windows:**
```bash
run-integration-tests.bat
```

**Linux/Mac:**
```bash
chmod +x run-integration-tests.sh
./run-integration-tests.sh
```

### Option 2: NPM Command

```bash
npm run test:integration
```

### Option 3: Manual Setup

```bash
# Set environment variables
set NODE_ENV=test
set MONGODB_URI=mongodb://localhost:27017/aircraft-defect-test
set JWT_SECRET=test-secret-key

# Run tests
npm run test:integration
```

## Start MongoDB Quickly

### Using Docker (Easiest)
```bash
docker run -d -p 27017:27017 --name mongodb-test mongo:6.0
```

### Using Local Installation
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# or
brew services start mongodb-community
```

## Start Redis (Optional)

### Using Docker
```bash
docker run -d -p 6379:6379 --name redis-test redis:7.0
```

### Using Local Installation
```bash
# Windows
redis-server

# Linux/Mac
sudo systemctl start redis
# or
brew services start redis
```

## What Gets Tested?

✅ **User Registration & Login** (10 tests)
- Registration validation
- Login/logout flow
- Token management

✅ **Inspection Workflow** (10 tests)
- Image upload
- Analysis triggering
- Results retrieval
- Report generation

✅ **Admin User Management** (9 tests)
- User CRUD operations
- Role management
- Access control

✅ **Admin Model Management** (6 tests)
- Model deployment
- Training workflows
- Performance validation

✅ **System Monitoring** (3 tests)
- Metrics retrieval
- Log filtering

✅ **Error Handling** (7 tests)
- Invalid inputs
- Authentication errors
- Edge cases

**Total: 50+ tests**

## Expected Output

```
PASS  __tests__/integration.test.js
  Integration Tests
    ✓ Complete User Registration and Login Flow (10 tests)
    ✓ End-to-End Inspection Workflow (10 tests)
    ✓ Admin User Management Workflow (9 tests)
    ✓ Admin Model Management Workflow (6 tests)
    ✓ System Monitoring and Metrics (3 tests)
    ✓ Error Handling and Edge Cases (7 tests)

Test Suites: 1 passed, 1 total
Tests:       45 passed, 45 total
Time:        45.123 s
```

## Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Fix:** Start MongoDB service or check connection string

### Port Already in Use
```
Error: listen EADDRINUSE :::3001
```
**Fix:** Stop conflicting process or change PORT

### Test Timeout
```
Error: Timeout - Async callback was not invoked
```
**Fix:** Check MongoDB performance or increase timeout

### Authentication Failures
```
Error: Invalid token
```
**Fix:** Verify JWT_SECRET is set correctly

## Need More Help?

📖 **Detailed Documentation:**
- [Integration Test Guide](__tests__/INTEGRATION_TEST_GUIDE.md)
- [Implementation Summary](TASK_30_INTEGRATION_TESTING_SUMMARY.md)
- [Unit Test README](__tests__/README.md)

🐛 **Common Issues:**
See troubleshooting section in [INTEGRATION_TEST_GUIDE.md](__tests__/INTEGRATION_TEST_GUIDE.md)

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Start MongoDB
  uses: supercharge/mongodb-github-action@1.10.0
  with:
    mongodb-version: 6.0

- name: Run Integration Tests
  run: npm run test:integration
  env:
    MONGODB_URI: mongodb://localhost:27017/aircraft-defect-test
```

## Test Execution Time

- **Expected Duration:** 30-60 seconds
- **Tests Run:** 50+
- **Database Operations:** Real MongoDB queries
- **Cleanup:** Automatic after completion

---

**Ready to test?** Run `run-integration-tests.bat` (Windows) or `./run-integration-tests.sh` (Linux/Mac)
