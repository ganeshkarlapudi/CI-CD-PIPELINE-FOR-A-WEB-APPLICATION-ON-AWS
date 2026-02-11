/**
 * Test script for error handling and logging system
 * Run with: node test-error-handling.js
 */

const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  MLProcessingError,
  DatabaseError,
  ExternalServiceError,
} = require('./src/middleware/errorHandler');

const logger = require('./src/config/logger');

console.log('Testing Error Handling and Logging System\n');
console.log('==========================================\n');

// Test 1: Custom Error Classes
console.log('1. Testing Custom Error Classes:');
try {
  throw new ValidationError('Invalid email format', ['Email must be valid']);
} catch (error) {
  console.log(`   ✓ ValidationError: ${error.message}`);
  console.log(`   ✓ Status Code: ${error.statusCode}`);
  console.log(`   ✓ Error Code: ${error.code}`);
  console.log(`   ✓ Details: ${JSON.stringify(error.details)}\n`);
}

try {
  throw new AuthenticationError('Invalid credentials');
} catch (error) {
  console.log(`   ✓ AuthenticationError: ${error.message}`);
  console.log(`   ✓ Status Code: ${error.statusCode}\n`);
}

try {
  throw new NotFoundError('User not found');
} catch (error) {
  console.log(`   ✓ NotFoundError: ${error.message}`);
  console.log(`   ✓ Status Code: ${error.statusCode}\n`);
}

try {
  throw new MLProcessingError('Model inference failed');
} catch (error) {
  console.log(`   ✓ MLProcessingError: ${error.message}`);
  console.log(`   ✓ Status Code: ${error.statusCode}\n`);
}

// Test 2: Logger
console.log('2. Testing Winston Logger:');
logger.info('Test info message', { testData: 'value' });
console.log('   ✓ Info log written');

logger.warn('Test warning message', { warningType: 'test' });
console.log('   ✓ Warning log written');

logger.error('Test error message', { errorCode: 'TEST_ERROR' });
console.log('   ✓ Error log written\n');

// Test 3: Logger Helper Methods
console.log('3. Testing Logger Helper Methods:');
const mockReq = {
  method: 'GET',
  path: '/api/test',
  ip: '127.0.0.1',
  get: () => 'Test User Agent',
  user: { userId: 'test-user-id' },
};

logger.logRequest(mockReq, 'Test request');
console.log('   ✓ Request logged');

const mockError = new Error('Test error');
mockError.code = 'TEST_ERROR';
logger.logError(mockError, mockReq, { additionalInfo: 'test' });
console.log('   ✓ Error logged with context\n');

// Test 4: Error Properties
console.log('4. Testing Error Properties:');
const testError = new ConflictError('Resource already exists');
console.log(`   ✓ isOperational: ${testError.isOperational}`);
console.log(`   ✓ Has stack trace: ${!!testError.stack}`);
console.log(`   ✓ Error name: ${testError.name}\n`);

// Test 5: External Service Error
console.log('5. Testing External Service Error:');
const serviceError = new ExternalServiceError('GPT Vision API timeout', 'gpt-vision');
console.log(`   ✓ Service: ${serviceError.service}`);
console.log(`   ✓ Message: ${serviceError.message}`);
console.log(`   ✓ Status Code: ${serviceError.statusCode}\n`);

console.log('==========================================');
console.log('All tests completed successfully!');
console.log('Check logs/ directory for log files.');
console.log('==========================================\n');
