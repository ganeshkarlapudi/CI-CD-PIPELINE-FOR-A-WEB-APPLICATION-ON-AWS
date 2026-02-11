// Mock sharp module for testing
module.exports = jest.fn(() => ({
  metadata: jest.fn().mockResolvedValue({
    width: 1920,
    height: 1080,
    format: 'jpeg',
  }),
  resize: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
}));
