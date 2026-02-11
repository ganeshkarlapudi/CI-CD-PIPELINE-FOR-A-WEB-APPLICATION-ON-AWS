// Mock uuid module for testing
module.exports = {
  v4: jest.fn(() => 'mock-uuid-1234-5678-90ab-cdef'),
};
