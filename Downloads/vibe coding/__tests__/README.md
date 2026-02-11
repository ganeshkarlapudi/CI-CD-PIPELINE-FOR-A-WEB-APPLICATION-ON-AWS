# Backend Unit Tests

This directory contains comprehensive unit tests for the Aircraft Defect Detection System backend.

## Test Structure

```
__tests__/
├── setup.js                 # Test environment setup
├── auth.test.js            # Authentication endpoint tests
├── middleware.test.js      # Middleware tests (auth, validation)
├── inspections.test.js     # Inspection endpoint tests
├── admin.test.js           # Admin endpoint tests
├── models.test.js          # Database model tests
├── monitoring.test.js      # Monitoring endpoint tests
└── utils/
    └── testHelpers.js      # Test utility functions
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test auth.test.js
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with verbose output
```bash
npm test -- --verbose
```

## Test Coverage

The test suite covers:

### Authentication Tests (`auth.test.js`)
- User registration (valid/invalid data, duplicate users)
- User login (valid/invalid credentials, account lockout, inactive accounts)
- User logout (token invalidation)
- Token verification (valid/expired/invalid tokens)

### Middleware Tests (`middleware.test.js`)
- JWT authentication middleware
- Token validation and blacklisting
- Session caching
- Role-based authorization
- Input validation middleware

### Inspection Tests (`inspections.test.js`)
- Image upload and validation
- Inspection history with pagination and filtering
- Inspection retrieval by ID
- Analysis triggering
- Results retrieval (completed, processing, failed states)
- Report generation (JSON and PDF formats)

### Admin Tests (`admin.test.js`)
- User management (list, create, update, delete)
- User search and filtering
- Role and status updates
- Model management
- System metrics retrieval

### Model Tests (`models.test.js`)
- User model methods (login attempts, account locking)
- Inspection model structure
- Model schema validation

### Monitoring Tests (`monitoring.test.js`)
- System metrics aggregation
- Log retrieval and filtering
- API cost tracking
- Error rate monitoring

## Mocking Strategy

All external dependencies are mocked:
- MongoDB models (User, Inspection, Model, etc.)
- Redis cache operations
- AWS S3 storage
- Logger
- External ML service

## Test Environment

Tests run in an isolated environment with:
- `NODE_ENV=test`
- Test-specific JWT secret
- Mock database connections
- Disabled console output (except errors)

## Writing New Tests

1. Create a new test file in `__tests__/`
2. Import required dependencies and mocks
3. Use test helpers from `utils/testHelpers.js`
4. Follow the existing test structure:
   ```javascript
   describe('Feature Name', () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });

     describe('Specific Functionality', () => {
       it('should do something', async () => {
         // Arrange
         // Act
         // Assert
       });
     });
   });
   ```

## Best Practices

- Clear all mocks before each test
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies
- Use async/await for asynchronous tests
- Verify both response status and body
- Test edge cases and error handling
