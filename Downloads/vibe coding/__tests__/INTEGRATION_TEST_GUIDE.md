# Integration Test Guide

## Overview

This guide covers the comprehensive integration tests for the Aircraft Defect Detection System. These tests validate complete workflows using a real MongoDB instance, ensuring all components work together correctly.

## Test Coverage

The integration test suite (`integration.test.js`) covers the following workflows:

### 1. Complete User Registration and Login Flow
- ✅ User registration with valid data
- ✅ Duplicate user prevention
- ✅ Password complexity validation
- ✅ Successful login with valid credentials
- ✅ Login rejection with invalid credentials
- ✅ Token verification
- ✅ User logout and token blacklisting
- ✅ Re-login after logout

### 2. End-to-End Inspection Workflow
- ✅ Image upload with authentication
- ✅ Upload rejection without authentication
- ✅ Invalid file type rejection
- ✅ Analysis triggering
- ✅ Results retrieval
- ✅ Inspection history with pagination
- ✅ Date range filtering
- ✅ JSON report generation
- ✅ PDF report generation
- ✅ Access control (users can't access other users' inspections)

### 3. Admin User Management Workflow
- ✅ List all users (admin only)
- ✅ Non-admin access prevention
- ✅ User search functionality
- ✅ Create new user as admin
- ✅ Update user role
- ✅ Deactivate user account
- ✅ Login prevention for deactivated users
- ✅ Reactivate user account
- ✅ Delete user account

### 4. Admin Model Management Workflow
- ✅ List all models
- ✅ Non-admin access prevention
- ✅ Upload training dataset
- ✅ Check training job status
- ✅ Deploy model version
- ✅ Reject deployment of low mAP models
- ✅ Retrieve model performance metrics

### 5. System Monitoring and Metrics
- ✅ Retrieve system metrics (admin only)
- ✅ Retrieve system logs with filtering
- ✅ Filter metrics by date range

### 6. Error Handling and Edge Cases
- ✅ Invalid inspection ID handling
- ✅ Missing authentication token
- ✅ Malformed JWT token
- ✅ Request body validation
- ✅ Concurrent request handling

## Prerequisites

### 1. MongoDB Instance
You need a running MongoDB instance for integration tests. The tests use the database specified in `MONGODB_URI` environment variable.

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# Windows: Download from https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod --dbpath /path/to/data
```

**Option B: Docker MongoDB**
```bash
docker run -d -p 27017:27017 --name mongodb-test mongo:6.0
```

**Option C: MongoDB Atlas**
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Get connection string and set in environment variable

### 2. Redis Instance (Optional)
Redis is used for session management and caching. If not available, some tests may be skipped.

```bash
# Docker Redis
docker run -d -p 6379:6379 --name redis-test redis:7.0

# Or install locally
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis
# Linux: sudo apt-get install redis-server
```

### 3. Environment Variables
Create a `.env.test` file or set these variables:

```env
NODE_ENV=test
PORT=3001
MONGODB_URI=mongodb://localhost:27017/aircraft-defect-test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-secret-key-change-in-production
JWT_EXPIRATION=24h
AWS_REGION=us-east-1
AWS_S3_BUCKET=test-bucket
AWS_ACCESS_KEY_ID=test-key
AWS_SECRET_ACCESS_KEY=test-secret
ML_SERVICE_URL=http://localhost:5000
```

## Running Integration Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Test Suite
```bash
npm run test:integration -- -t "User Registration and Login"
```

### Run with Verbose Output
```bash
npm run test:integration -- --verbose
```

### Run with Coverage
```bash
npm run test:integration -- --coverage
```

## Test Execution Flow

### Setup Phase (beforeAll)
1. Connect to test MongoDB database
2. Initialize Redis connection
3. Prepare test environment

### Test Execution
Tests run sequentially (--runInBand) to avoid race conditions:
1. User registration and login tests
2. Inspection workflow tests (uses tokens from step 1)
3. Admin user management tests (creates admin user)
4. Model management tests (uses admin token)
5. Monitoring tests
6. Error handling tests

### Cleanup Phase (afterAll)
1. Delete test users from database
2. Delete test inspections
3. Close MongoDB connection
4. Close Redis connection

## Test Data

### Test Users
- **Regular User**: `integrationuser` / `integration@test.com`
- **Admin User**: `integrationadmin` / `admin@test.com`
- **Temporary Users**: Created and deleted during specific tests

### Test Inspections
- Created during upload tests
- Cleaned up after test completion

### Test Models
- Created for deployment tests
- Cleaned up after test completion

## Troubleshooting

### MongoDB Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running on the specified port.

### Redis Connection Issues
```
Error: Redis connection failed
```
**Solution**: Check if Redis is running or disable Redis-dependent tests.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution**: Change PORT in environment variables or stop the conflicting process.

### Test Timeout
```
Error: Timeout - Async callback was not invoked within the 10000 ms timeout
```
**Solution**: Increase timeout in jest.config.js or specific test:
```javascript
jest.setTimeout(30000);
```

### Authentication Failures
```
Error: Invalid token
```
**Solution**: Ensure JWT_SECRET is set correctly and tokens are being generated properly.

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use beforeEach/afterEach for test-specific setup/cleanup
- Don't rely on test execution order (except for sequential workflows)

### 2. Data Cleanup
- Always clean up test data in afterAll/afterEach
- Use unique identifiers for test data
- Delete created resources after tests

### 3. Assertions
- Test both success and failure cases
- Verify response status codes
- Check response body structure
- Validate data persistence in database

### 4. Error Handling
- Test error scenarios explicitly
- Verify error messages are user-friendly
- Check that errors are logged properly

### 5. Performance
- Monitor test execution time
- Use --runInBand for sequential execution when needed
- Optimize database queries in tests

## Continuous Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
      
      redis:
        image: redis:7.0
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URI: mongodb://localhost:27017/aircraft-defect-test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
```

## Extending Tests

### Adding New Test Cases

1. **Identify the workflow** to test
2. **Add test suite** in appropriate describe block
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Clean up** any created resources

Example:
```javascript
describe('New Feature Workflow', () => {
  let resourceId;

  it('should create new resource', async () => {
    // Arrange
    const data = { name: 'test' };

    // Act
    const response = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(201);

    // Assert
    expect(response.body.success).toBe(true);
    resourceId = response.body.resourceId;
  });

  afterAll(async () => {
    // Cleanup
    await Resource.deleteOne({ _id: resourceId });
  });
});
```

## Test Metrics

### Expected Results
- **Total Tests**: 50+
- **Test Suites**: 6
- **Coverage**: >80% for integration paths
- **Execution Time**: <60 seconds (with real DB)

### Success Criteria
- All tests pass ✅
- No memory leaks
- Proper cleanup of resources
- No hanging connections

## Related Documentation

- [Unit Test README](./__tests__/README.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [Testing Summary](../TASK_27_TESTING_SUMMARY.md)
- [Requirements](../.kiro/specs/aircraft-defect-detection/requirements.md)
- [Design](../.kiro/specs/aircraft-defect-detection/design.md)

## Support

For issues or questions about integration tests:
1. Check this guide first
2. Review test output and error messages
3. Verify environment setup
4. Check MongoDB and Redis connections
5. Review related unit tests for component-level issues
