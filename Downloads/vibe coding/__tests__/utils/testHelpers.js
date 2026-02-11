const jwt = require('jsonwebtoken');

/**
 * Generate a test JWT token
 */
function generateToken(userData) {
  return jwt.sign(userData, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

/**
 * Create mock user data
 */
function createMockUser(overrides = {}) {
  return {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    loginAttempts: 0,
    lockoutUntil: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock admin data
 */
function createMockAdmin(overrides = {}) {
  return {
    _id: 'admin123',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    loginAttempts: 0,
    lockoutUntil: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock inspection data
 */
function createMockInspection(overrides = {}) {
  return {
    _id: 'insp123',
    userId: 'user123',
    imageUrl: 'https://example.com/image.jpg',
    status: 'completed',
    defects: [],
    processingTime: 1500,
    modelVersion: 'v1.0.0',
    imageMetadata: {
      filename: 'test.jpg',
      size: 1024000,
      format: 'jpeg',
      dimensions: {
        width: 1920,
        height: 1080,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock defect data
 */
function createMockDefect(overrides = {}) {
  return {
    class: 'crack',
    confidence: 0.95,
    bbox: {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    },
    source: 'yolo',
    ...overrides,
  };
}

/**
 * Create mock model data
 */
function createMockModel(overrides = {}) {
  return {
    _id: 'model123',
    version: 'v1.0.0',
    mAP: 0.96,
    status: 'deployed',
    trainingDate: new Date(),
    deploymentDate: new Date(),
    metrics: {
      precision: 0.95,
      recall: 0.94,
      f1Score: 0.945,
    },
    ...overrides,
  };
}

/**
 * Mock Express request object
 */
function mockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  };
}

/**
 * Mock Express response object
 */
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Mock Express next function
 */
function mockNext() {
  return jest.fn();
}

module.exports = {
  generateToken,
  createMockUser,
  createMockAdmin,
  createMockInspection,
  createMockDefect,
  createMockModel,
  mockRequest,
  mockResponse,
  mockNext,
};
