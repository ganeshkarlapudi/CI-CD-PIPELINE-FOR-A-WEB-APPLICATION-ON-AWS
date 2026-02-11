// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRATION = '24h';
process.env.MONGODB_URI = 'mongodb://localhost:27017/aircraft-defect-test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.ML_SERVICE_URL = 'http://localhost:5000';

// Increase timeout for all tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-90ab-cdef'),
}));
